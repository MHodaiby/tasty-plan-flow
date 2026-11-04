import { useState } from "react";
import { Pencil, Check, X, Phone, MapPin } from "lucide-react";
import { type SubStatus } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { type Profile } from "@/lib/data";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CustomerDetailsCardProps {
  customer: Profile;
  status: SubStatus | undefined;
  onSave: (updates: Pick<Profile, "full_name" | "delivery_address">) => Promise<void>;
}

export default function CustomerDetailsCard({
  customer,
  status = "not_active",
  onSave,
}: CustomerDetailsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(customer);
  const [isSaving, setIsSaving] = useState(false);

  const initials = formData.full_name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const handleCancel = () => {
    setFormData(customer);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      await onSave({
        full_name: formData.full_name,
        delivery_address: formData.delivery_address,
      });

      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-xl border bg-card text-card-foreground shadow-sm">
      <CardContent className="p-4 sm:p-8">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 lg:grid-cols-[auto_minmax(0,1.3fr)_minmax(220px,1fr)_auto] lg:gap-x-8">
          {/* Avatar */}
          <Avatar className="size-12 shrink-0 sm:size-18">
            {" "}
            <AvatarFallback className="bg-secondary text-lg font-semibold text-secondary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Name and Email */}
          <div className="min-w-0">
            {isEditing ? (
              <Input
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    full_name: e.target.value,
                  })
                }
                className="truncate font-sans text-sm font-semibold text-card-foreground lg:text-xl"
                placeholder="Customer name"
              />
            ) : (
              <h2 className="truncate text-lg font-semibold text-card-foreground lg:text-xl">
                {customer.full_name}
              </h2>
            )}

            <p className="mt-1 truncate text-xs text-muted-foreground lg:text-sm">
              {customer.email}
            </p>
          </div>

          {/* Status and Actions */}
          <div className="flex shrink-0 items-center justify-end gap-2 lg:col-start-4 lg:row-start-1">
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !formData.full_name.trim()}
                  className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="h-8"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-lg"
                onClick={() => setIsEditing(true)}
                aria-label="Edit customer"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Phone and Address */}
          <div className="col-span-3 grid grid-cols-1 gap-3 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:grid-cols-[1px_minmax(0,1fr)] lg:gap-x-5">
            {/* Desktop vertical separator */}
            <div className="hidden w-px self-stretch bg-border lg:row-span-2 lg:block" />

            {/* Phone */}
            <div className="flex min-w-0 items-center gap-3 lg:gap-1.5">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm text-foreground">{customer.phone}</span>
            </div>

            {/* Address */}
            <div className="flex min-w-0 items-center gap-3 lg:gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />

              {isEditing ? (
                <Input
                  value={formData.delivery_address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      delivery_address: e.target.value,
                    })
                  }
                  className="h-8 border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Delivery address"
                />
              ) : (
                <span className="truncate text-sm text-muted-foreground">
                  {customer.delivery_address}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
