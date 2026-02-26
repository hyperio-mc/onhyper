# X Thread: hyper-micro

🧵 Every app needs somewhere to put data. But setting up a database, configuring storage, managing auth — that's friction before you write your first feature.

So we built hyper-micro: a self-serve backend you can deploy anywhere in under 60 seconds.

[1/5]

What you get:

📦 Data API (LMDB) — key-value docs, zero config
📁 Storage API (S3-compatible) — files, images, whatever
🔑 Auth API — create, revoke, rotate keys

No migrations. No schema. Just store and retrieve JSON.

[2/5]

The beauty: it runs EVERYWHERE.

Same code. Same API. Your infrastructure.

railway up
fly launch
render deploy
npm start

Your data backend isn't tied to a vendor — it's a Docker container you control.

[3/5]

Why self-serve instead of Firebase/Supabase?

✅ Your infrastructure (not vendor lock-in)
✅ Your data (JSON in LMDB, files on your disk)
✅ Your pricing (whatever your host charges)
✅ Your control (full visibility into logs, metrics)

[4/5]

Deploy in 60 seconds:

git clone https://github.com/hyperio-mc/hyper-micro
echo "API_KEY=your-secret" > .env
railway up

Add a persistent volume and you have a production-ready data backend.

Your data. Your backend. Your cloud.

👇
https://github.com/hyperio-mc/hyper-micro

[5/5]