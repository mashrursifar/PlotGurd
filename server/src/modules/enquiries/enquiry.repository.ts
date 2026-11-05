import { EnquiryModel, type Enquiry } from "./enquiry.model.js";

export async function insertEnquiries(enquiries: readonly Enquiry[]): Promise<Enquiry[]> {
  return EnquiryModel.insertMany(enquiries);
}

export async function listEnquiriesForUser(userId: string): Promise<Enquiry[]> {
  return EnquiryModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();
}
