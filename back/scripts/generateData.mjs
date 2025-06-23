import fs from 'fs';
import bcrypt from 'bcrypt';
import { Client } from '@elastic/elasticsearch';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import moment from "moment";
import gremlin from 'gremlin';
import { exit } from 'process';

const esClient = new Client({
    node: "https://localhost:9200",
    auth: {
        apiKey: "Nk56a2xaY0IxOW1ZTGcxN0tUUGk6MjhyajBfUjl3WDBjSzJuNUJEMmxnUQ=="
    },
    tls: {
        rejectUnauthorized:false,
        ca: fs.readFileSync("/usr/share/es/certs/ca.crt"),
    }
});

const { t } = gremlin.process;

const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

const dc = new DriverRemoteConnection('ws://localhost:8182/gremlin');
const graph = new Graph();
const g = graph.traversal().withRemote(dc);

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
        mentions.push(`@${faker.internet.username()}`);
    }
    return mentions;
};

// Generate a random user profile
const generateProfile = async () => {
    const userName = faker.internet.username();
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    const bio = faker.lorem.sentence();
    const hashtags = generateHashtags(3);
    const email = `${userName}@gmail.com`;
    const password = `${userName}1`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const currentTime = moment();
    const momentData = {
        year: "2000",
        month: "12",
        day: "01",
        hour: currentTime.hour(),
        minute: currentTime.minute(),
        second: currentTime.second(),
        millisecond: currentTime.millisecond()
    };

    const birthDate = moment(momentData);

    const profile = {
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

    // Add profile to database
    const result = await g.addV("User")
        .property("email", email)
        .property("phone", faker.phone.number().replaceAll("-", ""))
        .property("userName", userName)
        .property("birthDate", birthDate.format("YYYY-MM-DD HH:mm:ss.000"))
        .property("joinDate", currentTime)
        .property("password", hashedPassword)
        .property("pfp", profile.pfp)
        .property("bio", bio)
        .property("pronouns", profile.pronouns)
        .property("link", profile.link)
        .property("gender", profile.gender)        
        .property("firstName", firstName)        
        .property("lastName", lastName)        
        .next();

    // Now add to ES
    const userId = result.value.id;
    profile.userId = userId;
    const esResult = await esClient.index({
        index: "profiles",
        document: profile
    });

    // Now update the profile id in the user vertex
    await g.V(userId)
        .property("profileId", esResult._id)
        .next();      

    return profile;
};

// Generate a random post
const generatePosts = async (profile) => {
    const captionText = faker.lorem.sentence();
    const locationText = faker.address.city();
    const hashtags = generateHashtags(3);
    const altText = faker.lorem.sentence();
    const userId = profile.userId;
    const userName = profile.userName;
    const posts = [];
    const collaborators = [];

    const postCount = Math.floor(Math.random() * 24);

    for (let i = 0; i < postCount; i++) {
        const post = {
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
                likesDisabled: faker.datatype.boolean(),
                collaborators
            },
            media: [
                {
                    id: uuidv4(),
                    userId,
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

        // Add to ES
        const esResult = await esClient.index({
            index: "main",
            document: post
        }); 
        
        let graphResult = await g.addV("Post")
            .property("esId", esResult._id)
            .next();   
            
        const postId = graphResult.value.id;

        // Now add the edges between the post and user verticies            
        graphResult = await g.V(postId)
            .as('post')
            .V(userId)
            .as('user')
            .addE("post_to_user")
            .from_("post")
            .to("user")
            .addE("user_to_post")
            .from_("user")
            .to("post")
            .next();        

        // Update the media entries with the postId for easier
        // and faster lookup. First update in ES
        const updatePostIdInMedia = {
            index: "main",
            id: esResult._id,
            script: {
                source:
                    `for (int i = 0; i < ctx._source.media.size(); i++) {
                        ctx._source.media[i].postId = params.postId;
                    }
                `,
                "params": {
                    "postId": `${postId}`
                },
                "lang": "painless"
            }        
        }

        await esClient.update(updatePostIdInMedia);
    }    

    return posts;
};

// Bulk index data to Elasticsearch
const bulkIndexData = async () => {
    const profiles = [];
    const posts = [];


    try {
        for (let i = 0; i < 100; i++) {
            console.log(`Generating profile ${i + 1}...`);


            const profile = await generateProfile();
            const posts = await generatePosts(profile);

            //


           /* profiles.push({
               index: { _index: 'profiles', _id: userId },
            });
            profiles.push(profile);
*/
            // const posts = generatePosts(uuidv4(), userId, userName);
            //posts.push({
            //    index: { _index: 'main', _id: post.postId },
            //});
            //posts.push(post);

            //await buildGraphElements(profile, post);
        }



        // Bulk index profiles and posts
        //const profileBulkResponse = await esClient.bulk({ body: profiles });
        //const postBulkResponse = await esClient.bulk({ body: posts });

        //console.log('Profiles indexed:', profileBulkResponse);
        //console.log('Posts indexed:', postBulkResponse);

    } catch (error) {
        console.error('Error bulk indexing:', error);
    }

    await dc.close();
    await esClient.close();

    console.log("Done");
};

// Run the bulk indexing function
bulkIndexData();
