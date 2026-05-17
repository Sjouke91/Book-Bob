"use client";

import { useState } from "react";

type OptionalTimeFieldsProps = {
  defaultPickupTime?: string;
  defaultReturnTime?: string;
};

export function OptionalTimeFields({
  defaultPickupTime = "",
  defaultReturnTime = ""
}: OptionalTimeFieldsProps) {
  const hasDefaultTimes = Boolean(defaultPickupTime || defaultReturnTime);
  const [isOpen, setIsOpen] = useState(hasDefaultTimes);

  return (
    <div className="optionalTimeGroup">
      <label className="checkboxLabel">
        <input
          type="checkbox"
          checked={isOpen}
          onChange={(event) => setIsOpen(event.target.checked)}
        />
        <span>Add times</span>
      </label>

      {isOpen ? (
        <div className="formGrid two compactFields">
          <label>
            <span>Pickup time</span>
            <input
              type="time"
              name="pickup_time"
              defaultValue={defaultPickupTime}
            />
          </label>
          <label>
            <span>Return time</span>
            <input
              type="time"
              name="return_time"
              defaultValue={defaultReturnTime}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
