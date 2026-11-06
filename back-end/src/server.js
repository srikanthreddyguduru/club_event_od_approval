import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

for (const key of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[key]) throw new Error(`${key} must be configured.`);
}
if (process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');

await connectDB();
const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`Club Event OD API listening on port ${port}`));
