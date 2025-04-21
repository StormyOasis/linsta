import config from 'config';
import fs from 'fs';

import { Client } from '@elastic/elasticsearch';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

const client = new Client({
    node: config.get("es.node"),
    auth: {
        apiKey: config.get("es.apiKey")
    },
    tls: {
        ca: fs.readFileSync("/usr/share/es/certs/ca.crt"),
    }
});


const HASHTAGS = ['#food', '#travel', '#fun', '#coding', '#music', '#nature', '#sunset', '#coffee'];
const MENTIONS = ['@alice', '@bob', '@charlie', '@dora', '@eve', '@frank'];

const getRandomFrom = <T>(arr: T[], min = 1, max = 3): T[] =>
  faker.helpers.arrayElements(arr, faker.number.int({ min, max }));

const insertHashtagsAndMentions = (text: string, hashtags: string[], mentions: string[]): string => {
  const allTags = [...hashtags, ...mentions];
  const shuffled = faker.helpers.shuffle(allTags);
  return `${text} ${shuffled.join(' ')}`.trim();
};

function generateDoc() {
  const postId = uuidv4();
  const hashtags = getRandomFrom(HASHTAGS);
  const mentions = getRandomFrom(MENTIONS, 0, 2);

  const baseText = faker.lorem.sentence(5);

  return {
    postId,
    hashtags,
    mentions,
    user: {
      userId: uuidv4(),
      userName: faker.internet.userName()
    },
    global: {
      dateTime: faker.date.recent().toISOString(),
      commentsDisabled: faker.datatype.boolean(),
      commentCount: faker.number.int({ min: 0, max: 300 }),
      likesDisabled: faker.datatype.boolean(),
      locationText: insertHashtagsAndMentions(faker.location.city(), hashtags, []),
      captionText: insertHashtagsAndMentions(baseText, hashtags, mentions)
    },
    media: [
      {
        id: uuidv4(),
        userId: uuidv4(),
        postId,
        path: faker.image.url(),
        altText: insertHashtagsAndMentions(faker.lorem.words(3), hashtags, []),
        mimeType: 'image/jpeg'
      }
    ]
  };
}

async function indexFakeData(count = 100) {
  const body = [];

  for (let i = 0; i < count; i++) {
    const doc = generateDoc();
    body.push({ index: { _index: 'main' } });
    body.push(doc);
  }

  const res = await client.bulk({ body });
  if (res.errors) {
    console.error('Some documents failed to index:', res.items?.filter(item => item.index?.error));
  } else {
    console.log(`✅ Indexed ${count} documents into "main" index.`);
  }
}

indexFakeData(100).catch(console.error);
