import { ProjectMemberRole } from "@/types/project";

export const canEditProjectContent = (role: ProjectMemberRole): boolean => {
  return role === "owner" || role === "member";
};

export const canManageProjectMembers = (role: ProjectMemberRole): boolean => {
  return role === "owner";
};

