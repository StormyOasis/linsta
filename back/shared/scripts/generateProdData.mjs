import fs from 'fs';
import bcrypt from 'bcrypt';
import { Client } from '@elastic/elasticsearch';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import moment from "moment";
import gremlin from 'gremlin';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import axios from 'axios'

const esClient = new Client({
    node: "https://search.linsta.lboydstun.com:9200",
    auth: {
        apiKey: "VFF0cGhwY0JqN1pNcFN0Zk9nRk06dE9PREVUbzVPaFViYWRRR0lINkREdw=="
    },
    tls: {
        rejectUnauthorized: false,
        ca: fs.readFileSync(path.resolve('./certs/ca.crt')),
    }
});

const { t } = gremlin.process;

const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

const options = {
    traversalsource: 'g',
    mimeType: 'application/vnd.gremlin-v3.0+json',
};
const dc = new DriverRemoteConnection('ws://db.linsta.lboydstun.com:8182/gremlin', options);
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
    let bio = faker.lorem.sentence();
    const hashtags = generateHashtags(3);
    const email = `${userName}@gmail.com`;
    const password = `${userName}1!`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const currentTime = moment();
    const momentData = {
        year: Number("2000"),
        month: Number("12") - 1,
        day: Number("01"),
        hour: currentTime.hour(),
        minute: currentTime.minute(),
        second: currentTime.second(),
        millisecond: currentTime.millisecond()
    };

        bio += "  ";
        for(const tag of hashtags) {
            bio += tag + " ";
        }        


    const birthDate = moment(momentData);

    let pfpUrl = null;
    let pfpExt = null;

    while (true) {
        pfpUrl = faker.image.avatar();

        const pathname = new URL(pfpUrl).pathname;
        const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
        if (filename.includes(".")) {
            pfpExt = filename.substring(filename.indexOf("."));
            break;
        }
    }

    const response = await fetch(pfpUrl);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pfpTmpFile = `/var/linsta/pfp-${crypto.randomUUID()}${pfpExt}`;
    const pfpNoPath = pfpTmpFile.substring(pfpTmpFile.lastIndexOf("/") + 1);

    await writeFile(pfpTmpFile, buffer);

    const profile = {
        userName,
        firstName,
        lastName,
        bio,
        mentions: generateMentions(3),
        hashtags,
        pfp: null, //populated later
        gender: faker.name.gender(),
        pronouns: faker.helpers.arrayElement(['he/him', 'she/her', 'they/them']),
        link: faker.internet.url(),
    };

    console.log("Adding to database...")
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

    const userId = result.value.id;
    profile.userId = userId;

    const loginRes = await login(userName, password);
    const token = loginRes.data.token;

    // Now add to ES
    console.log("Adding to ES...")
    const esResult = await esClient.index({
        index: "profiles",
        document: profile
    });

    // Now update the profile id in the user vertex
    const gr = await g.V(userId)
        .property("profileId", esResult._id)
        .next();

    await esClient.indices.refresh({ index: 'profiles' });

    const res = await putSubmitPfp(userId, pfpTmpFile, pfpNoPath, token, pfpExt, esResult._id);
    console.log(res.statusText);

    return profile;
};

const login = async (userName, password) => {
    console.log("Logging in...");
    const data = { userName, password };
    const res = await axios.post(`https://api.linsta.lboydstun.com/api/v1/accounts/login`, data);
    return res.data;
}

const putSubmitPfp = async (userId, pfpTmpFile, pfpNoPath, token, pfpExt, esId) => {
    console.log(`Uploading pfp for userId: ${userId} esId: ${esId}...`);
    // Need to use multipart-formdata since we are uploading files
    const form = new FormData();

    // Pfp user data
    form.append("userId", userId);

    // Pfp file data
    const fileBuffer = await readFile(pfpTmpFile);
    const blob = new Blob([fileBuffer], { type: getMimeTypeByFileExt(pfpExt) });

    form.append('fileData', blob, pfpNoPath);

    form.append("requestorUserId", userId);

    const headers = {};
    headers['Authorization'] = `Bearer ${token}`;

    const res = await axios.putForm(`https://api.linsta.lboydstun.com/api/v1/profiles/updatePfp`, form, { headers });

    return res;
}

// Generate a random post
const generatePosts = async (profile) => {
    const posts = [];

    const postCount = Math.floor(Math.random() * 24) + 1;

    const loginRes = await login(profile.userName, `${profile.userName}1!`);
    const token = loginRes.data.token;

    for (let i = 0; i < postCount; i++) {
        let captionText = faker.lorem.sentence();
        const locationText = faker.address.city();
        const hashtags = generateHashtags(3);
        const userId = profile.userId;
        const userName = profile.userName;       

        const mediaCount = Math.floor(Math.random() * 3) + 1;
        const entries = [];
        const fileData = [];
        for(let j = 0; j < mediaCount; j++) {
            let url = faker.image.avatar();
            while(!url.includes(".jpg")) {
                url = faker.image.avatar();
            }
            let ext = url.substring(url.lastIndexOf("."));

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const tmpFile = `/var/linsta/${crypto.randomUUID()}${ext}`;

            await writeFile(tmpFile, buffer);     
            
            const fileBuffer = await readFile(tmpFile);
            const blob = new Blob([fileBuffer], { type: getMimeTypeByFileExt(ext) });                    
            const entry = {
                id: crypto.randomUUID().replaceAll("-", ""),
                index: j,
                isVideofile: false,
                alt: faker.lorem.sentence(),
            } ;

            fileData.push({ id: entry.id, data: blob })
            entries.push(entry);           
        }

        captionText += ".  ";
        for(const tag of hashtags) {
            captionText += tag + " ";
        }        

        const post = {
            user: {
                userId,
                userName
            },
           // hashtags,
           // mentions: generateMentions(3),
            global: {
                captionText,
                locationText,
                dateTime: faker.date.recent(),
                commentsDisabled: faker.datatype.boolean(),
                commentCount: faker.number.int(),
                likesDisabled: faker.datatype.boolean(),
                collaborators: []
            },
            media: entries
        };

        const form = new FormData();

        // Include basic user info
        form.append("user", JSON.stringify({ userId, userName }));

        form.append("requestorUserId", userId);

        // Data that pertains to entire post, not just the images/videos contained within
        form.append("global", JSON.stringify(post.global));

        // Add the file list and associated info for each file
        form.append("entries", JSON.stringify(entries));

        // finally add the data for each file    
        fileData.map(entry => {
            form.append(entry.id, entry.data);
        });        
        const headers = {};
        headers['Authorization'] = `Bearer ${token}`;

        const res = await axios.putForm(`https://api.linsta.lboydstun.com/api/v1/posts/addPost`, form, { headers });            
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
            console.log(`Data generated for user: ${profile.userName}`);
        }

    } catch (error) {
        console.error('Error bulk indexing:', error);
    }

    await dc.close();
    await esClient.close();

    console.log("Done");
};

// Run the bulk indexing function
bulkIndexData();


const getMimeTypeByFileExt = (ext) => {
    if (!ext) throw new Error("File extension is required");

    switch (ext.toLowerCase()) {
        // Images
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";
        case ".png":
            return "image/png";
        case ".gif":
            return "image/gif";
        case ".webp":
            return "image/webp";
        case ".svg":
            return "image/svg+xml";
        case ".bmp":
            return "image/bmp";
        case ".tiff":
        case ".tif":
            return "image/tiff";
        case ".ico":
            return "image/x-icon";
        case ".heic":
        case ".heif":
            return "image/heic";

        // Videos
        case ".mp4":
            return "video/mp4";
        case ".mov":
            return "video/quicktime";
        case ".avi":
            return "video/x-msvideo";
        case ".wmv":
            return "video/x-ms-wmv";
        case ".webm":
            return "video/webm";
        case ".mpeg":
        case ".mpg":
            return "video/mpeg";
        case ".3gp":
            return "video/3gpp";
        case ".3g2":
            return "video/3gpp2";
        case ".flv":
            return "video/x-flv";
        case ".ogv":
            return "video/ogg";
        case ".mkv":
            return "application/x-matroska";

        default:
            throw new Error(`Unknown file extension: ${ext}`);
    }
}