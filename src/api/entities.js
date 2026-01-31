import { base44 } from './base44Client';

export const Project = base44.entities.Project;
export const Task = base44.entities.Task;
export const Comment = base44.entities.Comment;
export const Activity = base44.entities.Activity;
export const Notification = base44.entities.Notification;
export const Timesheet = base44.entities.Timesheet;
export const RecurringTask = base44.entities.RecurringTask;
export const UserGroup = base44.entities.UserGroup;
export const UserGroupMembership = base44.entities.UserGroupMembership;
export const Sprint = base44.entities.Sprint;
export const ProjectTemplate = base44.entities.ProjectTemplate;
export const ProjectFile = base44.entities.ProjectFile;
export const Document = base44.entities.Document;
export const ChatMessage = base44.entities.ChatMessage;
export const UserPresence = base44.entities.UserPresence;
export const Tenant = base44.entities.Tenant;
export const AuditLog = base44.entities.AuditLog;
export const Workspace = base44.entities.Workspace;
export const UserProfile = base44.entities.UserProfile;
export const WorkLocation = base44.entities.WorkLocation;
export const ClockEntry = base44.entities.ClockEntry;
export const Ticket = base44.entities.Ticket;
export const TicketComment = base44.entities.TicketComment;
export const OTPVerification = base44.entities.OTPVerification;

// --- ADDED MISSING EXPORTS ---
export const Leave = base44.entities.Leave;
export const LeaveType = base44.entities.LeaveType;
export const LeaveBalance = base44.entities.LeaveBalance;
export const UserPermission = base44.entities.UserPermission;
export const CompOffCredit = base44.entities.CompOffCredit;
export const ReportConfig = base44.entities.ReportConfig;

// Auth SDK export
export const User = base44.auth;