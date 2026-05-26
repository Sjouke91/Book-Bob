'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { addDays, format } from 'date-fns';

import { requireUser } from '@/lib/auth';
import {
  assertNoApprovedOverlap,
  getCamperContactEmails,
  getTripById,
  normalizeEmail,
  optionalString,
} from '@/lib/data';
import { buttonLink, emailShell, sendEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { dateRangeLabel } from '@/lib/dates';
import type { Trip, TripChangeRequest } from '@/lib/types';

function requiredString(value: FormDataEntryValue | null, label: string) {
  const text = String(value ?? '').trim();

  if (!text) {
    throw new Error(`${label} is required.`);
  }

  return text;
}

function optionalTime(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  return text ? `${text}:00` : null;
}

function validateDateRange(startDate: string, endDate: string) {
  if (endDate <= startDate) {
    throw new Error('Return date must be after the pickup date.');
  }
}

async function appUrl() {
  return getAppUrl(await headers());
}

async function notifyTrip(
  camperId: string,
  trip: Pick<Trip, 'id' | 'destination' | 'start_date' | 'end_date'>,
  subject: string,
  intro: string,
  buttonLabel = 'Open booking',
) {
  const { supabase } = await requireUser();
  const contacts = await getCamperContactEmails(supabase, camperId);
  const tripUrl = `${await appUrl()}/trips/${trip.id}`;
  const range = dateRangeLabel(trip.start_date, trip.end_date);

  await sendEmail({
    to: contacts,
    subject,
    text: `${intro}\n\n${trip.destination}\n${range}\n${tripUrl}`,
    html: emailShell(`
      <p>${intro}</p>
      <p><strong>${trip.destination}</strong><br>${range}</p>
      <p>${buttonLink(tripUrl, buttonLabel)}</p>
    `),
  });
}

export async function signInWithEmail(formData: FormData) {
  const email = normalizeEmail(formData.get('email'));

  if (!email) {
    redirect('/login?error=Email+is+required');
  }

  const supabase = await createClient();
  const origin = await appUrl();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/login?sent=1');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function createCamper(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = requiredString(formData.get('name'), 'Camper name');
  const description = optionalString(formData.get('description'));
  const friendEmail = normalizeEmail(formData.get('friend_email'));

  const { data: camper, error } = await supabase
    .from('campers')
    .insert({
      name,
      description,
      created_by: user.id,
    })
    .select('id, name')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from('camper_members').insert({
    camper_id: camper.id,
    user_id: user.id,
    role: 'owner',
  });

  if (friendEmail && friendEmail !== user.email) {
    await supabase.from('camper_invites').upsert(
      {
        camper_id: camper.id,
        email: friendEmail,
        invited_by: user.id,
      },
      { onConflict: 'camper_id,email' },
    );

    const inviteUrl = `${await appUrl()}/login`;
    await sendEmail({
      to: [friendEmail],
      subject: `You were invited to ${camper.name}`,
      text: `You were invited to the shared camper calendar for ${camper.name}.\n${inviteUrl}`,
      html: emailShell(`
        <p>You were invited to the shared camper calendar for <strong>${camper.name}</strong>.</p>
        <p>${buttonLink(inviteUrl, 'Open Book Bob')}</p>
      `),
    });
  }

  revalidatePath('/');
  redirect('/');
}

export async function createTrip(formData: FormData) {
  const { supabase, user } = await requireUser();
  const camperId = requiredString(formData.get('camper_id'), 'Camper');
  const startDate = requiredString(formData.get('start_date'), 'Pickup date');
  const endDate = requiredString(formData.get('end_date'), 'Return date');
  const destination = requiredString(
    formData.get('destination'),
    'Destination',
  );
  const pickupTime = optionalTime(formData.get('pickup_time'));
  const returnTime = optionalTime(formData.get('return_time'));

  validateDateRange(startDate, endDate);
  await assertNoApprovedOverlap(supabase, camperId, startDate, endDate);

  const reviewerId = await findReviewerId(supabase, camperId, user.id);
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      camper_id: camperId,
      requested_by: user.id,
      reviewer_id: reviewerId,
      start_date: startDate,
      end_date: endDate,
      pickup_time: pickupTime,
      return_time: returnTime,
      destination,
      companions: optionalString(formData.get('companions')),
      notes: optionalString(formData.get('notes')),
      status: 'pending_approval',
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await notifyTrip(
    camperId,
    trip as Trip,
    `Booking approval needed: ${destination}`,
    `${user.name} requested a camper booking for review.`,
    'Review booking',
  );

  revalidatePath('/');
  redirect(`/trips/${trip.id}`);
}

export async function updatePendingTrip(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = requiredString(formData.get('trip_id'), 'Trip');
  const trip = await getTripById(supabase, tripId);

  if (trip.requested_by !== user.id) {
    throw new Error('Only the requester can edit this pending trip.');
  }

  if (!['pending_approval', 'change_requested'].includes(trip.status)) {
    throw new Error('Only pending trips can be updated directly.');
  }

  const startDate = requiredString(formData.get('start_date'), 'Pickup date');
  const endDate = requiredString(formData.get('end_date'), 'Return date');
  const destination = requiredString(
    formData.get('destination'),
    'Destination',
  );

  validateDateRange(startDate, endDate);
  await assertNoApprovedOverlap(
    supabase,
    trip.camper_id,
    startDate,
    endDate,
    trip.id,
  );

  const { data: updatedTrip, error } = await supabase
    .from('trips')
    .update({
      start_date: startDate,
      end_date: endDate,
      pickup_time: optionalTime(formData.get('pickup_time')),
      return_time: optionalTime(formData.get('return_time')),
      destination,
      companions: optionalString(formData.get('companions')),
      notes: optionalString(formData.get('notes')),
      status: 'pending_approval',
      approval_message: null,
      reviewer_id: await findReviewerId(supabase, trip.camper_id, user.id),
    })
    .eq('id', trip.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await notifyTrip(
    trip.camper_id,
    updatedTrip as Trip,
    `Updated booking approval needed: ${destination}`,
    `${user.name} updated a booking request.`,
    'Review booking',
  );

  revalidatePath('/');
  revalidatePath(`/trips/${trip.id}`);
  redirect(`/trips/${trip.id}`);
}

export async function approveTrip(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = requiredString(formData.get('trip_id'), 'Trip');
  const trip = await getTripById(supabase, tripId);

  if (trip.requested_by === user.id) {
    throw new Error('The other owner needs to approve this booking.');
  }

  await assertNoApprovedOverlap(
    supabase,
    trip.camper_id,
    trip.start_date,
    trip.end_date,
    trip.id,
  );

  const { data: approvedTrip, error } = await supabase
    .from('trips')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      approval_message: optionalString(formData.get('message')),
    })
    .eq('id', trip.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from('trip_approval_events').insert({
    trip_id: trip.id,
    actor_id: user.id,
    event_type: 'approved',
    message: optionalString(formData.get('message')),
  });

  await notifyTrip(
    trip.camper_id,
    approvedTrip as Trip,
    `Booking approved: ${trip.destination}`,
    `${user.name} approved the camper booking.`,
    'Open booking',
  );

  revalidatePath('/');
  revalidatePath(`/trips/${trip.id}`);
}

export async function rejectTrip(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = requiredString(formData.get('trip_id'), 'Trip');
  const trip = await getTripById(supabase, tripId);

  if (trip.requested_by === user.id) {
    throw new Error('Use cancel for your own request.');
  }

  const message = optionalString(formData.get('message'));
  const { data: rejectedTrip, error } = await supabase
    .from('trips')
    .update({
      status: 'rejected',
      approval_message: message,
    })
    .eq('id', trip.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from('trip_approval_events').insert({
    trip_id: trip.id,
    actor_id: user.id,
    event_type: 'rejected',
    message,
  });

  await notifyTrip(
    trip.camper_id,
    rejectedTrip as Trip,
    `Booking rejected: ${trip.destination}`,
    `${user.name} rejected the booking request.`,
    'Open booking',
  );

  revalidatePath('/');
  revalidatePath(`/trips/${trip.id}`);
}

export async function requestTripChanges(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = requiredString(formData.get('trip_id'), 'Trip');
  const message = requiredString(formData.get('message'), 'Message');
  const trip = await getTripById(supabase, tripId);

  if (trip.requested_by === user.id) {
    throw new Error('The reviewer requests changes.');
  }

  const { data: updatedTrip, error } = await supabase
    .from('trips')
    .update({
      status: 'change_requested',
      approval_message: message,
    })
    .eq('id', trip.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from('trip_approval_events').insert({
    trip_id: trip.id,
    actor_id: user.id,
    event_type: 'change_requested',
    message,
  });

  await notifyTrip(
    trip.camper_id,
    updatedTrip as Trip,
    `Booking changes requested: ${trip.destination}`,
    `${user.name} requested changes to the booking.`,
    'Open booking',
  );

  revalidatePath('/');
  revalidatePath(`/trips/${trip.id}`);
}

export async function proposeTripEdit(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = requiredString(formData.get('trip_id'), 'Trip');
  const trip = await getTripById(supabase, tripId);

  if (trip.status !== 'approved') {
    throw new Error('Only approved trips use change requests.');
  }

  const startDate = requiredString(formData.get('start_date'), 'Pickup date');
  const endDate = requiredString(formData.get('end_date'), 'Return date');
  const destination = requiredString(
    formData.get('destination'),
    'Destination',
  );

  validateDateRange(startDate, endDate);
  await assertNoApprovedOverlap(
    supabase,
    trip.camper_id,
    startDate,
    endDate,
    trip.id,
  );

  const { data: changeRequest, error } = await supabase
    .from('trip_change_requests')
    .insert({
      trip_id: trip.id,
      requested_by: user.id,
      reviewer_id: await findReviewerId(supabase, trip.camper_id, user.id),
      proposed_start_date: startDate,
      proposed_end_date: endDate,
      proposed_pickup_time: optionalTime(formData.get('pickup_time')),
      proposed_return_time: optionalTime(formData.get('return_time')),
      proposed_destination: destination,
      proposed_companions: optionalString(formData.get('companions')),
      proposed_notes: optionalString(formData.get('notes')),
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await notifyTrip(
    trip.camper_id,
    {
      id: trip.id,
      destination,
      start_date: (changeRequest as TripChangeRequest).proposed_start_date,
      end_date: (changeRequest as TripChangeRequest).proposed_end_date,
    },
    `Booking edit approval needed: ${destination}`,
    `${user.name} proposed changes to an approved booking.`,
    'Review changes',
  );

  revalidatePath('/');
  revalidatePath(`/trips/${trip.id}`);
}

export async function approveChangeRequest(formData: FormData) {
  const { supabase, user } = await requireUser();
  const changeRequestId = requiredString(
    formData.get('change_request_id'),
    'Change request',
  );

  const { data: changeRequest, error: readError } = await supabase
    .from('trip_change_requests')
    .select('*')
    .eq('id', changeRequestId)
    .single();

  if (readError) {
    throw new Error(readError.message);
  }

  const request = changeRequest as TripChangeRequest;

  if (request.requested_by === user.id) {
    throw new Error('The other owner needs to approve this edit.');
  }

  const trip = await getTripById(supabase, request.trip_id);

  await assertNoApprovedOverlap(
    supabase,
    trip.camper_id,
    request.proposed_start_date,
    request.proposed_end_date,
    trip.id,
  );

  const { data: updatedTrip, error } = await supabase
    .from('trips')
    .update({
      start_date: request.proposed_start_date,
      end_date: request.proposed_end_date,
      pickup_time: request.proposed_pickup_time,
      return_time: request.proposed_return_time,
      destination: request.proposed_destination,
      companions: request.proposed_companions,
      notes: request.proposed_notes,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', trip.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from('trip_change_requests')
    .update({
      status: 'approved',
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_message: optionalString(formData.get('message')),
    })
    .eq('id', request.id);

  await notifyTrip(
    trip.camper_id,
    updatedTrip as Trip,
    `Booking edit approved: ${request.proposed_destination}`,
    `${user.name} approved the booking changes.`,
    'Open booking',
  );

  revalidatePath('/');
  revalidatePath(`/trips/${trip.id}`);
}

export async function rejectChangeRequest(formData: FormData) {
  const { supabase, user } = await requireUser();
  const changeRequestId = requiredString(
    formData.get('change_request_id'),
    'Change request',
  );

  const { data: changeRequest, error: readError } = await supabase
    .from('trip_change_requests')
    .select('*')
    .eq('id', changeRequestId)
    .single();

  if (readError) {
    throw new Error(readError.message);
  }

  const request = changeRequest as TripChangeRequest;

  if (request.requested_by === user.id) {
    throw new Error('The other owner needs to reject this edit.');
  }

  const trip = await getTripById(supabase, request.trip_id);

  await supabase
    .from('trip_change_requests')
    .update({
      status: 'rejected',
      reviewer_id: user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_message: optionalString(formData.get('message')),
    })
    .eq('id', request.id);

  await notifyTrip(
    trip.camper_id,
    trip,
    `Booking edit rejected: ${trip.destination}`,
    `${user.name} rejected the proposed booking changes.`,
    'Open booking',
  );

  revalidatePath('/');
  revalidatePath(`/trips/${trip.id}`);
}

export async function cancelTrip(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = requiredString(formData.get('trip_id'), 'Trip');
  const trip = await getTripById(supabase, tripId);

  if (trip.requested_by !== user.id && trip.approved_by !== user.id) {
    throw new Error('Only an owner connected to this trip can cancel it.');
  }

  const { data: cancelledTrip, error } = await supabase
    .from('trips')
    .update({
      status: 'cancelled',
      approval_message: optionalString(formData.get('message')),
    })
    .eq('id', trip.id)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await notifyTrip(
    trip.camper_id,
    cancelledTrip as Trip,
    `Booking cancelled: ${trip.destination}`,
    `${user.name} cancelled the booking.`,
    'Open booking',
  );

  revalidatePath('/');
  revalidatePath(`/trips/${trip.id}`);
}

export async function markTripCompleted(formData: FormData) {
  const { supabase } = await requireUser();
  const tripId = requiredString(formData.get('trip_id'), 'Trip');
  const trip = await getTripById(supabase, tripId);

  const { error } = await supabase
    .from('trips')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', trip.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/history');
  revalidatePath(`/trips/${trip.id}`);
}

export async function saveTripReview(formData: FormData) {
  const { supabase } = await requireUser();
  const tripId = requiredString(formData.get('trip_id'), 'Trip');
  const rating = Number(formData.get('review_rating') ?? 0);

  const { error } = await supabase
    .from('trips')
    .update({
      review_rating: Number.isFinite(rating) && rating > 0 ? rating : null,
      review_text: optionalString(formData.get('review_text')),
      highlights: optionalString(formData.get('highlights')),
    })
    .eq('id', tripId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/history');
  revalidatePath(`/trips/${tripId}`);
}

export async function uploadTripPhoto(formData: FormData) {
  const { supabase, user } = await requireUser();
  const tripId = requiredString(formData.get('trip_id'), 'Trip');
  const file = formData.get('photo');

  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose a photo to upload.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${tripId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('trip-photos')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error } = await supabase.from('trip_photos').insert({
    trip_id: tripId,
    storage_path: path,
    caption: optionalString(formData.get('caption')),
    uploaded_by: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/history');
  revalidatePath(`/trips/${tripId}`);
}

export async function updateCamper(formData: FormData) {
  const { supabase } = await requireUser();
  const camperId = requiredString(formData.get('camper_id'), 'Camper');
  const name = requiredString(formData.get('name'), 'Camper name');
  const description = optionalString(formData.get('description'));

  const { error } = await supabase
    .from('campers')
    .update({ name, description })
    .eq('id', camperId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/settings');
  redirect('/settings?saved=1');
}

export async function addCamperRecipient(formData: FormData) {
  const { supabase, user } = await requireUser();
  const camperId = requiredString(formData.get('camper_id'), 'Camper');
  const email = normalizeEmail(formData.get('email'));

  if (!email) {
    throw new Error('Email is required.');
  }
  if (email === user.email) {
    throw new Error("That's your own email address.");
  }

  const { data: camperRow } = await supabase
    .from('campers')
    .select('name')
    .eq('id', camperId)
    .single();

  const { error } = await supabase
    .from('camper_invites')
    .upsert(
      { camper_id: camperId, email, invited_by: user.id },
      { onConflict: 'camper_id,email' },
    );

  if (error) {
    throw new Error(error.message);
  }

  try {
    const inviteUrl = `${await appUrl()}/login`;
    await sendEmail({
      to: [email],
      subject: `You were added to ${camperRow?.name ?? 'a shared camper'}`,
      text: `You have been added as a recipient for ${camperRow?.name}.\n${inviteUrl}`,
      html: emailShell(`
        <p>You have been added as a notification recipient for <strong>${camperRow?.name}</strong>.</p>
        <p>${buttonLink(inviteUrl, 'Open Book Bob')}</p>
      `),
    });
  } catch {
    // email failure is non-fatal — the recipient is saved regardless
  }

  revalidatePath('/settings');
  redirect('/settings?added=1');
}

export async function removeInvite(formData: FormData) {
  const { supabase } = await requireUser();
  const inviteId = requiredString(formData.get('invite_id'), 'Invite');

  const { error } = await supabase
    .from('camper_invites')
    .delete()
    .eq('id', inviteId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/settings');
  redirect('/settings');
}

export async function deleteTrip(formData: FormData) {
  const { supabase } = await requireUser();
  const tripId = requiredString(formData.get('trip_id'), 'Trip');

  // getTripById enforces RLS — throws if trip not found or user lacks access
  const trip = await getTripById(supabase, tripId);

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', trip.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/');
  revalidatePath('/history');
  redirect('/');
}

const SEED_EMAIL = 's.bosma1991@gmail.com';

export async function createSeedTrip(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (user.email !== SEED_EMAIL) throw new Error('Not authorized.');

  const camperId = requiredString(formData.get('camper_id'), 'Camper');
  const startDate = requiredString(formData.get('start_date'), 'Start date');
  const endDate = requiredString(formData.get('end_date'), 'End date');
  const destination = requiredString(
    formData.get('destination'),
    'Destination',
  );
  const status = String(formData.get('status') ?? 'completed');
  const companions = optionalString(formData.get('companions'));
  const notes = optionalString(formData.get('notes'));

  const isApproved = ['approved', 'completed'].includes(status);

  const { error } = await supabase.from('trips').insert({
    camper_id: camperId,
    requested_by: user.id,
    reviewer_id: user.id,
    start_date: startDate,
    end_date: endDate,
    destination,
    companions,
    notes,
    status,
    approved_by: isApproved ? user.id : null,
    approved_at: isApproved ? new Date().toISOString() : null,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  });

  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/history');
  redirect('/seed?created=1');
}

export async function seedSampleTrips(formData: FormData) {
  const { supabase, user } = await requireUser();
  if (user.email !== SEED_EMAIL) throw new Error('Not authorized.');

  const camperId = requiredString(formData.get('camper_id'), 'Camper');

  const trips = [
    {
      destination: 'Veluwe, Netherlands',
      start: '2024-04-06',
      end: '2024-04-13',
    },
    { destination: 'Provence, France', start: '2024-06-22', end: '2024-07-02' },
    {
      destination: "Côte d'Azur, France",
      start: '2024-08-10',
      end: '2024-08-17',
    },
    {
      destination: 'Black Forest, Germany',
      start: '2024-09-14',
      end: '2024-09-21',
    },
    { destination: 'Tuscany, Italy', start: '2024-10-05', end: '2024-10-15' },
    { destination: 'Normandy, France', start: '2025-01-18', end: '2025-01-25' },
    {
      destination: 'Ardennes, Belgium',
      start: '2025-02-22',
      end: '2025-03-01',
    },
    { destination: 'Norwegian Fjords', start: '2025-03-29', end: '2025-04-08' },
  ];

  const rows = trips.map((t) => ({
    camper_id: camperId,
    requested_by: user.id,
    reviewer_id: user.id,
    start_date: t.start,
    end_date: t.end,
    destination: t.destination,
    status: 'completed',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('trips').insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath('/');
  revalidatePath('/history');
  redirect('/seed?seeded=1');
}

async function findReviewerId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  camperId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('camper_members')
    .select('user_id')
    .eq('camper_id', camperId)
    .neq('user_id', userId)
    .limit(1)
    .maybeSingle();

  return data?.user_id ?? null;
}

export async function defaultTripDates() {
  const today = new Date();

  return {
    start: format(today, 'yyyy-MM-dd'),
    end: format(addDays(today, 2), 'yyyy-MM-dd'),
  };
}
