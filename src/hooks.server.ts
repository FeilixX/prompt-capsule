import { getDb } from '$lib/server/db';

// Force config validation + DB/schema init at BOOT, not on the first request:
// adapter-node imports hooks eagerly but route modules lazily, so without this a
// bad ADMIN_TOKEN (too short) or a violated program-name/slugLength invariant
// would pass boot silently and then crash-loop on the first capsule request.
// systemd should see a misconfigured deploy die at startup, loudly.
getDb();
