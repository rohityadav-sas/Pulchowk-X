const API_BASE = '/api/event';

export interface Club {
    id: number;
    authClubId: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    email?: string;
    isActive?: boolean;
    createdAt?: string;
    upcomingEvents?: number;
    completedEvents?: number;
    totalParticipants?: number;
}

export interface ClubEvent {
    id: number;
    clubId: number;
    title: string;
    description: string | null;
    eventType: string;
    status: string;
    venue: string | null;
    maxParticipants: number | null;
    currentParticipants: number;
    registrationDeadline: string | null;
    eventStartTime: string;
    eventEndTime: string;
    bannerUrl: string | null;
    isRegistrationOpen: boolean;
    createdAt: string;
    club?: Club;
}

export interface Registration {
    id: number;
    studentId: number;
    eventId: number;
    status: string;
    registeredAt: string;
    event?: ClubEvent & { club?: Club };
}


export async function getClubs(): Promise<{ success: boolean; existingClub?: Club[]; message?: string }> {
    const res = await fetch(`${API_BASE}/clubs`, {
        credentials: 'include',
    });
    const clone = res.clone();
    try {
        const json = await res.json();
        return json.data;
    } catch (e) {
        console.error("Failed to parse getClubs response", await clone.text());
        return { success: false, message: "Invalid server response" };
    }
}


export async function getClub(clubId: number): Promise<{ success: boolean; clubData?: Club; message?: string }> {
    const res = await fetch(`${API_BASE}/clubs/${clubId}`, {
        credentials: 'include',
    });
    const clone = res.clone();
    try {
        const json = await res.json();
        return json.data;
    } catch (e) {
        console.error("Failed to parse getClub response", await clone.text());
        return { success: false, message: "Invalid server response" };
    }
}


export async function getClubEvents(clubId: number): Promise<{ success: boolean; clubEvents?: ClubEvent[]; message?: string }> {
    const res = await fetch(`${API_BASE}/events/${clubId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });
    const clone = res.clone();
    try {
        const json = await res.json();
        return json.data;
    } catch (e) {
        console.error("Failed to parse getClubEvents response", await clone.text());
        return { success: false, message: "Invalid server response" };
    }
}


export async function getUpcomingEvents(): Promise<{ success: boolean; upcomingEvents?: ClubEvent[]; message?: string }> {
    try {
        const res = await fetch(`${API_BASE}/get-upcoming-events`, {
            credentials: 'include',
        });
        const json = await res.json();
        return json.data;
    } catch (error: any) {
        console.error("Error", error.message);
        return { success: false, message: "Invalid server response" };
    }
}


export async function getAllEvents(): Promise<{ success: boolean; allEvents?: ClubEvent[]; message?: string }> {
    try {
        const res = await fetch(`${API_BASE}/all-events`, {
            credentials: 'include',
        });
        const json = await res.json();
        return json.data;
    } catch (error: any) {
        console.error(error.message);
        return { success: false, message: "Invalid server response" };
    }
}


export async function createEvent(authId: string, clubId: number, eventData: {
    title: string;
    description: string;
    eventType: string;
    venue: string;
    maxParticipants: number;
    registrationDeadline: string;
    eventStartTime: string;
    eventEndTime: string;
    bannerUrl?: string;
}): Promise<{ success: boolean; event?: ClubEvent; message?: string }> {


    try {
        const payload = { authId, clubId, ...eventData };
        console.log('Payload before stringify:', payload);

        const bodyString = JSON.stringify(payload);
        console.log('Stringified body:', bodyString);

        const res = await fetch(`${API_BASE}/create-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: bodyString,
        });

        console.log('Response status:', res.status);
        const json = await res.json();
        console.log('Response json:', json);

        return json.data;
    } catch (error: any) {
        console.error('Error:', error.message);
        throw error;
    }
}


export async function getClubAdmins(clubId: number): Promise<{ success: boolean; admins?: any[]; message?: string }> {
    try {
        const res = await fetch(`${API_BASE}/club/admins/${clubId}`, {
            credentials: 'include'
        });
        return await res.json();
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function addClubAdmin(clubId: number, email: string, ownerId: string): Promise<{ success: boolean; message?: string }> {
    try {
        const res = await fetch(`${API_BASE}/club/add-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ clubId, email, ownerId })
        });
        return await res.json();
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function removeClubAdmin(clubId: number, userId: string, ownerId: string): Promise<{ success: boolean; message?: string }> {
    try {
        const res = await fetch(`${API_BASE}/club/remove-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ clubId, userId, ownerId })
        });
        return await res.json();
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


export async function createClub(clubData: {
    name: string;
    description?: string;
    email: string;
    logoUrl?: string;
}): Promise<{ success: boolean; club?: Club; message?: string }> {
    try {
        const res = await fetch(`${API_BASE}/create-club`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(clubData),
        });
        const json = await res.json();
        return json;
    } catch (error) {
        console.error(error);
        return { success: false, message: "Internal server response" }
    }
}

export async function registerForEvent(authStudentId: string, eventId: number): Promise<{ success: boolean; message?: string }> {
    try {
        const res = await fetch(`${API_BASE}/register-event`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ authStudentId, eventId }),
        });
        const json = await res.json();
        return json.data;
    } catch (error) {
        console.error(error);
        return { success: false, message: "Internal server response" };
    }
}


export async function cancelRegistration(authStudentId: string, eventId: number): Promise<{ success: boolean; message?: string }> {
    try {
        const res = await fetch(`${API_BASE}/cancel-registration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ authStudentId, eventId }),
        });
        const json = await res.json();
        return json.data;
    } catch (error) {
        console.error(error);
        return { success: false, message: "Internal server response" };
    }
}


export async function getEnrollments(authStudentId: string): Promise<{ success: boolean; registrations?: any[]; message?: string }> {
    const res = await fetch(`${API_BASE}/enrollment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ authStudentId }),
    });
    const clone = res.clone();
    try {
        const json = await res.json();
        return json.data;
    } catch (e) {
        console.error("Failed to parse getEnrollments response", await clone.text());
        return { success: false, message: "Invalid server response" };
    }
}


export async function getRegisteredStudents(eventId: number): Promise<any> {
    try {
        const res = await fetch(`${API_BASE}/registered-student`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ eventId }),
        });
        const json = await res.json();
        return json.data;
    } catch (error) {
        return { success: false, message: "Invalid server response" };
    }
}
