import { connectDatabase, disconnectDatabase } from "../src/db.js";
import { FieldModel } from "../src/models.js";

await connectDatabase();

const fields = await FieldModel.find({
  $or: [
    { locationLabel: { $exists: false } },
    { locationLabel: "" },
    { setupLevel: { $exists: false } },
    { needsSupportReview: { $exists: false } },
  ],
}).select("area city locationLabel setupLevel needsSupportReview");

for (const field of fields) {
  const locationLabel = field.locationLabel?.trim()
    || [field.area, field.city].filter(Boolean).join(", ");
  await FieldModel.updateOne(
    { _id: field._id },
    {
      $set: {
        locationLabel,
        setupLevel: field.setupLevel ?? "COMPLETE",
        needsSupportReview: field.needsSupportReview ?? false,
      },
    },
  );
}

console.log(`Backfilled ${fields.length} field setup record${fields.length === 1 ? "" : "s"}.`);
await disconnectDatabase();
