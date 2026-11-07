import { EnquiryModel, type Enquiry } from "./enquiry.model.js";

export async function insertEnquiries(enquiries: readonly Enquiry[]): Promise<Enquiry[]> {
  return EnquiryModel.insertMany(enquiries);
}

export async function createEnquiry(enquiry: Omit<Enquiry, "_id" | "createdAt" | "updatedAt">): Promise<Enquiry> {
  const created = await EnquiryModel.create(enquiry);
  return created.toObject();
}

export async function findEnquiryById(id: string): Promise<Enquiry | null> {
  return EnquiryModel.findById(id).lean().exec();
}

export async function listEnquiriesForUser(userId: string): Promise<Enquiry[]> {
  return EnquiryModel.find({ userId }).sort({ createdAt: -1 }).lean().exec();
}

export async function listEnquiriesPage(
  page: number,
  limit: number,
  status?: Enquiry["status"],
): Promise<{ enquiries: Enquiry[]; total: number }> {
  const filter = status ? { status } : {};
  const [enquiries, total] = await Promise.all([
    EnquiryModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),
    EnquiryModel.countDocuments(filter).exec(),
  ]);

  return { enquiries, total };
}

export async function updateEnquiryById(
  id: string,
  updates: Partial<Enquiry>,
): Promise<Enquiry | null> {
  return EnquiryModel.findByIdAndUpdate(id, updates, { new: true }).lean().exec();
}
