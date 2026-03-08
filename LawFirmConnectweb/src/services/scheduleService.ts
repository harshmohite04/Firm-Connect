import api from "./api";

export interface AttendeeUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  attendees?: AttendeeUser[];
  caseId?: string;
  status?: string;
  type?: string;
  isOnlineMeeting?: boolean;
  meetingLink?: string;
}

const getEvents = async (): Promise<CalendarEvent[]> => {
  const response = await api.get("/schedule");
  return response.data;
};

const createEvent = async (eventData: any): Promise<CalendarEvent> => {
  const response = await api.post("/schedule", eventData);
  return response.data;
};

const deleteEvent = async (id: string): Promise<void> => {
  await api.delete(`/schedule/${id}`);
};

const updateEvent = async (
  id: string,
  eventData: any,
): Promise<CalendarEvent> => {
  const response = await api.put(`/schedule/${id}`, eventData);
  return response.data;
};

const searchUsers = async (query: string): Promise<AttendeeUser[]> => {
  const response = await api.get(
    `/schedule/search-users?q=${encodeURIComponent(query)}`
  );
  return response.data;
};

const scheduleService = {
  getEvents,
  createEvent,
  deleteEvent,
  updateEvent,
  searchUsers,
};

export default scheduleService;
