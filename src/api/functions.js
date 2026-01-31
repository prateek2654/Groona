import { base44 } from './base44Client';

export const updateUserProfile = (data) => base44.functions.invoke('updateUserProfile', data);
export const sendOTP = (data) => base44.functions.invoke('sendOTP', data);
export const verifyOTP = (data) => base44.functions.invoke('verifyOTP', data);