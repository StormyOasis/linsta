import config from 'config';
import fs from 'fs';
import { Client } from '@elastic/elasticsearch';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

const esClient = new Client({
    node: config.get("es.node"),
    auth: {
        apiKey: config.get("es.apiKey")
    },
    tls: {
        ca: fs.readFileSync("/usr/share/es/certs/ca.crt"),
    }
});

// Utility function to generate hashtags
const generateHashtags = (num) => {
    const hashtags = [];
    for (let i = 0; i < num; i++) {
        hashtags.push(`#${faker.hacker.noun()}`);
    }
    return hashtags;
};

// Utility function to generate mentions
const generateMentions = (num) => {
    const mentions = [];
    for (let i = 0; i < num; i++) {
        mentions.push(`@${faker.internet.userName()}`);
    }
    return mentions;
};

// Generate a random user profile
const generateProfile = (userId) => {
    const userName = faker.internet.userName();
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    const bio = faker.lorem.sentence();
    const hashtags = generateHashtags(3);

    return {
        userId,
        userName,
        firstName,
        lastName,
        bio,
        mentions: generateMentions(3),
        hashtags,
        pfp: faker.image.avatar(),
        gender: faker.name.gender(),
        pronouns: faker.helpers.arrayElement(['he/him', 'she/her', 'they/them']),
        link: faker.internet.url(),

        // Use the actual values in suggest fields
        userName_suggest: {
            input: [userName]
        },
        firstName_suggest: {
            input: [firstName]
        },
        lastName_suggest: {
            input: [lastName]
        },
        bio_suggest: {
            input: [bio]
        },
        hashtags_suggest: {
            input: hashtags
        }
    };
};

// Generate a random post
const generatePost = (postId, userId) => {
    const userName = faker.internet.userName();
    const captionText = faker.lorem.sentence();
    const locationText = faker.address.city();
    const hashtags = generateHashtags(3);
    const altText = faker.lorem.sentence();

    return {
        postId,
        user: {
            userId,
            userName
        },
        hashtags,
        mentions: generateMentions(3),
        global: {
            captionText,
            locationText,
            dateTime: faker.date.recent(),
            commentsDisabled: faker.datatype.boolean(),
            commentCount: faker.number.int(),
            likesDisabled: faker.datatype.boolean()
        },
        media: [
            {
                id: uuidv4(),
                userId,
                postId,
                path: faker.image.avatar(),
                altText,
                mimeType: 'image/jpeg'
            }
        ],
        // SUGGEST fields using the same values
        userName_suggest: {
            input: [userName]
        },
        captionText_suggest: {
            input: [captionText]
        },
        locationText_suggest: {
            input: [locationText]
        },
        hashtags_suggest: {
            input: hashtags
        },
        altText_suggest: {
            input: [altText]
        }
    };
};



// Bulk index data to Elasticsearch
const bulkIndexData = async () => {
    const profiles = [];
    const posts = [];
    for (let i = 0; i < 1000; i++) {
        const userId = uuidv4();
        const profile = generateProfile(userId);
        profiles.push({
            index: { _index: 'profiles', _id: userId },
        });
        profiles.push(profile);

        const post = generatePost(uuidv4(), userId);
        posts.push({
            index: { _index: 'main', _id: post.postId },
        });
        posts.push(post);
    }

    try {
        // Bulk index profiles and posts
        const profileBulkResponse = await esClient.bulk({ body: profiles });
        const postBulkResponse = await esClient.bulk({ body: posts });

        console.log('Profiles indexed:', profileBulkResponse);
        console.log('Posts indexed:', postBulkResponse);
    } catch (error) {
        console.error('Error bulk indexing:', error);
    }
};

// Run the bulk indexing function
bulkIndexData();
