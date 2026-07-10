import process from 'node:process';
import {authenticate} from '@google-cloud/local-auth';
import {google} from 'googleapis';



async function listEvents(accessToken, refreshToken) {
    try {
        const googleAuthClient = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `http://localhost:${process.env.PORT || 3000}/login/google/callback`
        );

        googleAuthClient.setCredentials(
            {
                access_token: accessToken
            }
        )

        const calendar = google.calendar({version: 'v3', auth: googleAuthClient});

        const result = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
        });
        const events = result.data.items;
        if (!events || events.length === 0) {
        console.log('No upcoming events found.');
        return {
        status: 404,
        message: 'No upcoming events found',
        events: []
        };
        }
        console.log('Upcoming 10 events:');

        // Print the start time and summary of each event.
        for (const event of events) {
        const start = event.start?.dateTime ?? event.start?.date;
        console.log(`${start} - ${event.summary}`);
        }
        return {
        status: 200,
        message: 'Events fetched successfully',
        events: events
        };
    } catch (error) { 
        console.error('Error fetching events:', error);
        // return {
        //     status: 500,
        //     message: 'Error fetching events',
        //     events: []
        // };
        throw error;
    }
  
}

export {
    listEvents
}