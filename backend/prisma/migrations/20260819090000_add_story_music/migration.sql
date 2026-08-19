-- AlterTable
ALTER TABLE "Story" ADD COLUMN "musicSongId" TEXT,
ADD COLUMN "musicSongTitle" TEXT,
ADD COLUMN "musicSongArtist" TEXT,
ADD COLUMN "musicAudioUrl" TEXT,
ADD COLUMN "musicCoverUrl" TEXT,
ADD COLUMN "musicStartTime" DOUBLE PRECISION,
ADD COLUMN "musicDuration" DOUBLE PRECISION;
