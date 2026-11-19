export type FormState = { error?: string; message?: string } | undefined;

export type BookingStatus = "requested" | "assigned" | "accepted" | "in_progress" | "completed" | "cancelled";
export type ProStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Pro {
  id: number;
  name: string;
  phone: string;
  city: string;
  pincode: string;
  address: string;
  experience_years: number;
  about: string;
  id_type: string;
  id_last4: string;
  id_doc_url: string | null;
  status: ProStatus;
  status_note: string;
  aadhaar_verified: boolean;
  aadhaar_verified_at: Date | null;
  kyc_mode: string;
  is_online: boolean;
  last_lat: number | null;
  last_lng: number | null;
  last_seen_at: Date | null;
  created_at: Date;
}

export interface Service {
  id: number;
  code: string | null;
  name: string;
  description: string;
  price: number;
  pro_payout: number;
  active: boolean;
  sort_order: number;
}

export interface City {
  id: number;
  name: string;
  active: boolean;
}

export interface Booking {
  id: number;
  ref: string;
  service_id: number;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  phone_verified: boolean;
  product_title: string;
  product_variant: string;
  product_sku: string;
  product_url: string;
  shopify_order: string;
  address: string;
  city: string;
  pincode: string;
  preferred_date: Date;
  preferred_slot: string;
  notes: string;
  source: string;
  status: BookingStatus;
  pro_id: number | null;
  pro_name: string | null;
  rejected_by: number[];
  price: number;
  pro_payout: number;
  payout_status: "unpaid" | "paid";
  completion_code: string;
  checkin_at: Date | null;
  checkin_lat: number | null;
  checkin_lng: number | null;
  completed_at: Date | null;
  checkout_lat: number | null;
  checkout_lng: number | null;
  pro_notes: string;
  rating: number | null;
  feedback: string;
  created_at: Date;
  updated_at: Date;
}

export interface BookingPhoto {
  id: number;
  booking_id: number;
  kind: "before" | "after";
  url: string;
  created_at: Date;
}

export interface BookingEvent {
  id: number;
  actor: string;
  message: string;
  created_at: Date;
}
