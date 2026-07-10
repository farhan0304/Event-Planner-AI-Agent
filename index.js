import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { listEvents } from './Controllers/calendar-events.js';

const app = express();
dotenv.config();

const port = process.env.PORT || 3000;


app.use(cors({
	origin: process.env.CORS_ORIGIN,
	credentials: true,
}))

app.use(session(
	{
		secret: process.env.SESSION_SECRET || "fallback-secret-session-akkljfk",
		resave: false,
		saveUninitialized: true,
		cookie: {
			secure: process.env.NODE_ENV === 'production'
		}
	}

))
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy(
	{
		clientID: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURL: `http://localhost:${port}/login/google/callback`
	},
	function (accessToken, refreshToken, profile, done) {
		
		return done(null, {
			profile,
			accessToken
		});
	}
))

passport.serializeUser((user, done) => {
	const { accessToken, ...userProfile } = user;
    done(null, userProfile);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});


app.use(express.json());
app.use(express.urlencoded({ 
	extended: true,
	limit: '16kb'
}));

app.use(express.static("public"));
app.use(cookieParser());



app.get('/', (req, res) => {
	res.send(`
        <h1>Home Page</h1>
        <a href="/login/google">Login with Google</a>
    `);
});

app.get('/login/google', 
	passport.authenticate('google', {
		scope: [
			'openid',
			'profile',
			'email',
			'https://www.googleapis.com/auth/calendar.events',
			'https://www.googleapis.com/auth/calendar.readonly'
		]
	})
);

app.get('/login/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
	// console.log('User authenticated successfully and now redirected:', req?.user);

	const cookieOptions = { 
		httpOnly: true,
		secure: true
	}

    res
	.cookie('accessToken', req.user.accessToken, cookieOptions)
	.redirect('/profile');
  }
);

app.get('/profile', (req, res) => {
	if (!req.isAuthenticated()) {
		return res.redirect('/');
	}
	console.log('User profile:', req?.user);
	const userProfile = req.user?.profile;

	res.send(`
        <h1>Profile Page</h1>
        <p>Welcome, <strong>${userProfile.displayName}</strong>!</p>
        <p>Email: ${userProfile.emails[0].value}</p>
		<img src="${userProfile.photos[0].value}" alt="Profile Picture" width="100" height="100">
		<br>
		<a href="/events">View Upcoming Events</a>
        <br><br>
        <a href="/logout">Logout</a>
    `);
});

app.get('/events', async (req, res) => {
	if (!req.isAuthenticated()) {
		console.log('User not authenticated. Redirecting to home page.');
		return res.redirect('/');
	}
	console.log('Fetching events for user:', req.user.profile.displayName);
	try {
		const eventsResponse = await listEvents(req.cookies?.accessToken);
		if (eventsResponse.status === 404 || eventsResponse.status === 500) {
			res.status(eventsResponse.status).send(
				`<h1>${eventsResponse.message}</h1>`
			);
		} else {
			res.status(200)
			.send( `
				<h1>Upcoming Events</h1>
				<ul>
					${eventsResponse.events.map(event => `<li>${event.start?.dateTime ?? event.start?.date} - ${event.summary}</li>`).join('')}
				</ul>
				<a href="/profile">Back to Profile</a>
			`);
		}
	}
	catch (error) {
		console.error('Error fetching events:', error);
		res.status(500).send(
			`<h1>Error fetching events</h1>`
		);
	}
})

app.get('/logout', (req, res, next) => {
    
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});


app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
