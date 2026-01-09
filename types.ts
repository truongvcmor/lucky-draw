
export enum UserType {
  EMPLOYEE = 'EMPLOYEE',
  GUEST = 'GUEST'
}

export interface Participant {
  id: string;
  name: string;
  type: UserType;
  seniorityYears: number; // >= 3 years gets double weight
  assignedNumber: number;
}

export interface Prize {
  id: string;
  name: string;
  quantity: number; // Remaining quantity
  initialQuantity: number; // Total quantity for progress bar
  image?: string; // Optional icon/image
  color: string;
}

export interface Settings {
  totalNumbers: number; // Default 80
  blacklistedNumbers: number[]; // Numbers that exist but have 0% chance
}

export interface SpinResult {
  winnerNumber: number;
  winnerParticipant?: Participant;
}

export interface WheelSegment {
  text: string;
  value: number;
  isBlacklisted: boolean;
  color: string;
  textColor: string;
}

export interface WinRecord {
  id: string;
  participantName: string;
  participantNumber: number;
  prizeName: string;
  prizeColor: string;
  timestamp: number;
}