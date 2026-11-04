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

  const handleChange = (field: keyof Profile, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  const inputClass =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <Card className="rounded-2xl border-[#E5E0D7] bg-white shadow-none">
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 lg:grid-cols-[auto_minmax(0,1.3fr)_minmax(220px,1fr)_auto] lg:gap-x-8">
          {/* Avatar */}
          <Avatar className="size-14 shrink-0 sm:size-18">
            {" "}
            <AvatarFallback className="bg-[#DCE5D8] text-[22px] font-semibold text-[#48634C]">
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
                className="truncate text-sm font-semibold text-[#252821] lg:text-xl"
                placeholder="Customer name"
              />
            ) : (
              <h2 className="truncate text-lg font-semibold text-[#252821] lg:text-xl">
                {customer.full_name}
              </h2>
            )}

            <p className="mt-1 truncate text-xs text-[#786B58] lg:text-sm">{customer.email}</p>
          </div>

          {/* Status and Actions */}
          <div className="flex shrink-0 items-center justify-end gap-2 lg:col-start-4 lg:row-start-1">
            <StatusBadge status={status} />
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !formData.full_name.trim()}
                  className="h-8 bg-primary hover:bg-primary/90"
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
                className="h-10 w-10 rounded-[9px] border-[#D8D2C8] bg-white"
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
            <div className="hidden w-px self-stretch bg-[#E5E0D7] lg:row-span-2 lg:block" />

            {/* Phone */}
            <div className="flex min-w-0 items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-[#786B58]" />
              <span className="truncate text-sm text-[#252821]">{customer.phone}</span>
            </div>

            {/* Address */}
            <div className="flex min-w-0 items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0 text-[#786B58]" />

              {isEditing ? (
                <Input
                  value={formData.delivery_address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      delivery_address: e.target.value,
                    })
                  }
                  className="h-8 border-[#D8D2C8] text-sm"
                  placeholder="Delivery address"
                />
              ) : (
                <span className="truncate text-sm text-[#786B58]">{customer.delivery_address}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
