-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SALES', 'REGION_MGR', 'FINANCE', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PENDING_CONFIRM', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AftersaleReason" AS ENUM ('QUALITY', 'WRONG_GOODS', 'DAMAGED', 'OTHER');

-- CreateEnum
CREATE TYPE "AftersaleStatus" AS ENUM ('PENDING_OA', 'SAP_CREATED', 'IN_HANDLING', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FollowKind" AS ENUM ('APPROVAL', 'INQUIRY', 'AFTERSALE', 'GENERAL');

-- CreateEnum
CREATE TYPE "FollowStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BizKind" AS ENUM ('MEETING', 'STOCKING', 'SHIPMENT', 'ADVERT', 'STORE', 'SUBSIDY', 'RENTAL', 'COMPLAINT');

-- CreateEnum
CREATE TYPE "BizStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SALES',
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshTokenHash" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "bp" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cat" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "addr" TEXT NOT NULL,
    "regionBp" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amtCents" BIGINT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT,
    "customerId" TEXT NOT NULL,
    "signedBy" TEXT,
    "status" TEXT NOT NULL,
    "amtCents" BIGINT NOT NULL,
    "fileUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "cat" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amtCents" BIGINT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "qty" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedShipDate" TIMESTAMP(3),
    "address" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remark" TEXT,

    CONSTRAINT "OrderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aftersale" (
    "id" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "reason" "AftersaleReason" NOT NULL,
    "status" "AftersaleStatus" NOT NULL DEFAULT 'PENDING_OA',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "images" TEXT[],
    "oaFlowId" TEXT,
    "createdById" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aftersale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT,
    "kind" "FollowKind" NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "node" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "status" "FollowStatus" NOT NULL DEFAULT 'PENDING',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizSubmission" (
    "id" TEXT NOT NULL,
    "kind" "BizKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "BizStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT,
    "oaFlowId" TEXT,
    "createdById" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dict" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Dict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "bodyHash" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "driver" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "User_refreshTokenHash_key" ON "User"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_bp_key" ON "Customer"("bp");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE INDEX "Customer_isDeleted_status_idx" ON "Customer"("isDeleted", "status");

-- CreateIndex
CREATE INDEX "Customer_regionBp_idx" ON "Customer"("regionBp");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_no_key" ON "Project"("no");

-- CreateIndex
CREATE INDEX "Project_isDeleted_customerId_idx" ON "Project"("isDeleted", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_no_key" ON "Contract"("no");

-- CreateIndex
CREATE INDEX "Contract_isDeleted_status_idx" ON "Contract"("isDeleted", "status");

-- CreateIndex
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_no_key" ON "Product"("no");

-- CreateIndex
CREATE INDEX "Product_isDeleted_cat_idx" ON "Product"("isDeleted", "cat");

-- CreateIndex
CREATE UNIQUE INDEX "Order_no_key" ON "Order"("no");

-- CreateIndex
CREATE INDEX "Order_isDeleted_status_orderDate_idx" ON "Order"("isDeleted", "status", "orderDate");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_createdById_idx" ON "Order"("createdById");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderLog_orderId_at_idx" ON "OrderLog"("orderId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Aftersale_no_key" ON "Aftersale"("no");

-- CreateIndex
CREATE INDEX "Aftersale_isDeleted_status_idx" ON "Aftersale"("isDeleted", "status");

-- CreateIndex
CREATE INDEX "Aftersale_orderId_idx" ON "Aftersale"("orderId");

-- CreateIndex
CREATE INDEX "Aftersale_customerId_idx" ON "Aftersale"("customerId");

-- CreateIndex
CREATE INDEX "FollowTask_userId_status_idx" ON "FollowTask"("userId", "status");

-- CreateIndex
CREATE INDEX "FollowTask_dueAt_idx" ON "FollowTask"("dueAt");

-- CreateIndex
CREATE INDEX "BizSubmission_kind_isDeleted_status_idx" ON "BizSubmission"("kind", "isDeleted", "status");

-- CreateIndex
CREATE INDEX "BizSubmission_customerId_idx" ON "BizSubmission"("customerId");

-- CreateIndex
CREATE INDEX "BizSubmission_createdById_idx" ON "BizSubmission"("createdById");

-- CreateIndex
CREATE INDEX "Dict_kind_isActive_idx" ON "Dict"("kind", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Dict_kind_code_key" ON "Dict"("kind", "code");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_objectKey_key" ON "StoredFile"("objectKey");

-- CreateIndex
CREATE INDEX "StoredFile_uploadedById_isDeleted_idx" ON "StoredFile"("uploadedById", "isDeleted");

-- CreateIndex
CREATE INDEX "StoredFile_expiresAt_idx" ON "StoredFile"("expiresAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLog" ADD CONSTRAINT "OrderLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aftersale" ADD CONSTRAINT "Aftersale_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aftersale" ADD CONSTRAINT "Aftersale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aftersale" ADD CONSTRAINT "Aftersale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowTask" ADD CONSTRAINT "FollowTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowTask" ADD CONSTRAINT "FollowTask_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizSubmission" ADD CONSTRAINT "BizSubmission_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizSubmission" ADD CONSTRAINT "BizSubmission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

