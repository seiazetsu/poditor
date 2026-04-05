export type ProjectSummary = {
  id: string;
  name: string;
  ownerUid: string;
  updatedAt: string;
};

export type ProjectDetail = ProjectSummary & {
  createdAt: string;
  currentUserRole: ProjectMemberRole;
};

export type ProjectMemberRole = "owner" | "member" | "viewer";

export type ProjectMember = {
  id: string;
  uid: string;
  email: string;
  role: ProjectMemberRole;
  createdAt: string;
  updatedAt: string;
};
