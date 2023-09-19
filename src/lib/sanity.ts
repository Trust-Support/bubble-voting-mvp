import { createClient } from '@sanity/client'

export const sanity = createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    token: process.env.SANITY_TOKEN,
    useCdn: false,
    apiVersion: '2023-09-14'
});
