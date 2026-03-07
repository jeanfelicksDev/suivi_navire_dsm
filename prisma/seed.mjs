import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const actions = [
        "Réception documents OCL",
        "Validation douane",
        "Paiement frais",
        "Inspection navire",
        "Déchargement conteneurs",
        "Fichier sydam corrigé"
    ]

    console.log('Seeding action templates...')

    for (const name of actions) {
        await prisma.actionTemplate.upsert({
            where: { name },
            update: {},
            create: { name }
        })
    }

    console.log('Seeding finished.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
