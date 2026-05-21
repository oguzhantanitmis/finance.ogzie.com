import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  if (process.env.PRISMA_CLIENT_ENGINE_TYPE === 'binary') {
    delete process.env.PRISMA_CLIENT_ENGINE_TYPE
  }
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
