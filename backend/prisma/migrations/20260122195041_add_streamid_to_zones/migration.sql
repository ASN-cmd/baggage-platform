-- DropForeignKey
ALTER TABLE "Zone" DROP CONSTRAINT "Zone_cameraId_fkey";

-- AlterTable
ALTER TABLE "Zone" ADD COLUMN     "streamId" TEXT,
ALTER COLUMN "cameraId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE SET NULL ON UPDATE CASCADE;
