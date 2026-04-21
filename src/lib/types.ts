export type StudentRecord = {
  id: string;
  full_name: string;
  matric_number: string;
  email: string;
  mtu_email: string;
  phone_number: string;
  parent_email: string;
  parent_phone: string;
  created_at: string;
};

export type ResultRecord = {
  id: string;
  matric_number: string;
  pdf_url: string;
  uploaded_at: string;
  published_at: string | null;
  delivery_state: string;
  delivery_attempts: number;
  last_error: string | null;
  updated_at: string;
};

export type NotificationRecord = {
  id: string;
  matric_number: string;
  email_status: string;
  sms_status: string;
  whatsapp_status: string;
  timestamp: string;
  error_message: string | null;
};

export type DashboardStats = {
  studentCount: number;
  resultCount: number;
  publishedCount: number;
  pendingCount: number;
  failedDeliveries: number;
  partialDeliveries: number;
};
