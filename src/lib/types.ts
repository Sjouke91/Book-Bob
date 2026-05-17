export type TripStatus =
  | "pending_approval"
  | "approved"
  | "change_requested"
  | "rejected"
  | "cancelled"
  | "completed";

export type ChangeRequestStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
};

export type Camper = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

export type Trip = {
  id: string;
  camper_id: string;
  requested_by: string;
  reviewer_id: string | null;
  start_date: string;
  end_date: string;
  pickup_time: string | null;
  return_time: string | null;
  destination: string;
  companions: string | null;
  notes: string | null;
  status: TripStatus;
  approval_message: string | null;
  review_rating: number | null;
  review_text: string | null;
  highlights: string | null;
  approved_by: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TripChangeRequest = {
  id: string;
  trip_id: string;
  requested_by: string;
  reviewer_id: string | null;
  proposed_start_date: string;
  proposed_end_date: string;
  proposed_pickup_time: string | null;
  proposed_return_time: string | null;
  proposed_destination: string;
  proposed_companions: string | null;
  proposed_notes: string | null;
  status: ChangeRequestStatus;
  reviewer_message: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type TripPhoto = {
  id: string;
  trip_id: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: string;
  created_at: string;
};

export type PhotoWithUrl = TripPhoto & {
  signedUrl: string | null;
};

export type UserContext = {
  id: string;
  email: string;
  name: string;
};
