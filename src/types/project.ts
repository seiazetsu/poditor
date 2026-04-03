export type ProjectSummary = {
  id: string;
  name: string;
  ownerUid: string;
  updatedAt: string;
};

export type ProjectDetail = ProjectSummary & {
  createdAt: string;
};

export type ProjectMemberRole = "owner" | "member";

export type ProjectMember = {
  id: string;
  uid: string;
  email: string;
  role: ProjectMemberRole;
  createdAt: string;
  updatedAt: string;
};
