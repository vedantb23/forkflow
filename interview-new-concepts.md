# USER PERSONAL FILE DONOR TOUCH 

# index in sql 
# problem of req.user in typescript so need of express.d.ts file 
# ekda redis wapis kar for learning only imp concept , check from claude concepts used in this project ONLY - Redis distributed lock using SET NX PX pattern.
# sql injection 
# check all features race condn,redis visualise , redis use redis stack image see redis gui in browser for visaualising 
# why is idempotency key needed 
# Always release every lock we acquired, in reverse order ??? why rev order 
# The plan says: "notification.worker.ts — import io from realtime/socket.ts and emit." That can't work as written. Your io (Socket.io server) lives in the API process (server.ts). Your notification worker lives in a separate process (npm run worker). A separate process has no access to that in-memory io object — importing it would just create a second, broken Socket.io instance with no connected clients.
This is exactly the problem Redis Pub/Sub solves, and it's a great interview talking point.

# the worker (separate process) can't touch the API's in-memory io. The Redis adapter routes room messages through Pub/Sub, so when the worker publishes an emit (Piece 3), the API process that holds the browser's connection delivers it. That's also what makes it horizontally scalable.

#  RATE LIMITNG SLIDING WINDOWS