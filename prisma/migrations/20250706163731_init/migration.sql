-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "stravaId" INTEGER NOT NULL,
    "username" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "polyline" TEXT NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Peak" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "elevation" INTEGER NOT NULL,

    CONSTRAINT "Peak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeakOnActivity" (
    "peakId" INTEGER NOT NULL,
    "activityId" INTEGER NOT NULL,

    CONSTRAINT "PeakOnActivity_pkey" PRIMARY KEY ("peakId","activityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaId_key" ON "User"("stravaId");

-- CreateIndex
CREATE UNIQUE INDEX "Peak_name_key" ON "Peak"("name");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeakOnActivity" ADD CONSTRAINT "PeakOnActivity_peakId_fkey" FOREIGN KEY ("peakId") REFERENCES "Peak"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeakOnActivity" ADD CONSTRAINT "PeakOnActivity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
