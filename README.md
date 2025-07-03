# Linstagram

> A full-featured, enterprise-grade social networking platform inspired by Instagram.  
> Built with a cloud-native architecture for high performance, scalability, and real-time interactivity.

⚠️ **Note**: This project is not intended for public use and is not affiliated with Meta in any way.

---

## 🧠 Project Overview

Linstagram replicates the core functionality of a modern social media platform. Users can:

- Create profiles
- Post media
- Comment and like
- Follow others

### Enterprise-grade Features

- Secure authentication with JWT
- AWS-powered geolocation suggestions
- Distributed, event-driven backend architecture
- Infrastructure optimized for cost and performance

---

## 🧰 Tech Stack

### 🖥️ Front-End

- ⚛️ React (with SSR)
- 🎛️ Redux
- 🟦 TypeScript
- 💛 JavaScript
- 🧱 HTML & CSS
- 💅 styled-components
- 🧪 Jest
- 📝 Facebook Lexical Editor

### 🧠 Back-End

- 🌐 Node.js
- 🧵 Koa.js
- 🔐 JWT Authentication
- 🧠 Redis
- 🔎 ElasticSearch
- 🔗 JanusGraph (Gremlin API)
- ☁️ AWS S3, SES, SNS, SQS
- 📍 AWS Location Services

### ⚙️ Infrastructure, DevOps & Tooling

- 🐳 Docker / Docker Compose
- 🐙 GitHub
- ⚡ Serverless Framework
- ☁️ AWS EC2, Lambda, CloudFront
- 🌐 NGINX
- 🛠️ Jira
- 📊 Grafana
- 📈 Kibana
- 🔬 Insomnia REST Client

---

## 🖼️ Screenshots

| Description | Preview |
|------------|---------|
| **User Registration**<br/>With validation and JWT | ![Signup](https://d1xxvwtswm7wsd.cloudfront.net/about/signup.png) |
| **Confirmation Email**<br/>Signup email received via SES | ![Confirmation Email](https://d1xxvwtswm7wsd.cloudfront.net/about/confirmationEmail.png) |
| **Main Feed**<br/>Posts from followed users | ![Main Feed](https://d1xxvwtswm7wsd.cloudfront.net/about/mainFeed.png) |
| **Explore Page with Search**<br/>Search popout and results | ![Explore](https://d1xxvwtswm7wsd.cloudfront.net/about/exploreWithSearch.png) |
| **Create Post Flow**<br/>With captions, location, settings | ![Create Post](https://d1xxvwtswm7wsd.cloudfront.net/about/createPost.png) |
| **Comment Modal**<br/>Add, like, and reply to comments | ![Comment Modal](https://d1xxvwtswm7wsd.cloudfront.net/about/commentModal.png) |
| **Profile Page**<br/>User bio and post grid | ![Profile](https://d1xxvwtswm7wsd.cloudfront.net/about/profilePage.png) |
| **Edit Profile**<br/>Change bio, picture, and info | ![Edit Profile](https://d1xxvwtswm7wsd.cloudfront.net/about/editProfile.png) |
| **Grafana Metrics Dashboard** | ![Metrics](https://d1xxvwtswm7wsd.cloudfront.net/about/metrics.png) |
| **Mobile Create Post Flow** | ![Create Post Mobile](https://d1xxvwtswm7wsd.cloudfront.net/about/createPostMobile.png) |
| **Mobile Feed View** | ![Main Feed Mobile](https://d1xxvwtswm7wsd.cloudfront.net/about/mainFeedMobile.png) |

---

## 🚧 Challenges & Solutions

### 💸 Infrastructure Cost
The biggest challenge was keeping infrastructure cost low without compromising on architecture quality.

- **Graph Database:**  
  Originally planned to use AWS Neptune, but even a minimal instance was too costly.  
  ✅ Solution: Self-hosted JanusGraph on an existing EC2 instance.

- **Backend Hosting:**  
  Tested AWS Lambda for the Node.js API. Cold starts caused unacceptable latency.  
  ✅ Solution: Chose a long-running EC2 instance instead for performance and cost balance.

---

## 🚀 What's Next

These are the current high-priority Jira issues under development:

- **LINSTA-130**: Epic - Create notification and messaging systems  
- **LINSTA-127**: Collect frontend metrics and send to SQS / Lambdas for processing  
- **LINSTA-131**: Refactor Gremlin queries to avoid read-then-write transaction conflicts  
- **LINSTA-133**: Set up CI/CD via Jenkins or AWS CodeBuild/Deploy  

---

## 🔐 Login Instructions

⚠️ **Signup is currently restricted** due to AWS SES sandbox limitations.  
A request has been submitted to move to production mode.

In the meantime, you may use the following test credentials:

| Username       | Password       |
|----------------|----------------|
| `linstatest01` | `Linstatest01!` |
| `linstatest02` | `Linstatest02!` |

---

## 🔗 Visit the App

👉 [**Visit Linstagram**](https://your-app-url.com/login)

---

## 🧾 License

This project is not licensed for public or commercial use.  
It's intended for demonstration, architectural exploration, and internal learning only.

---

## 🛠️ Developer

Built by [**StormyOasis**](https://github.com/StormyOasis)  
📂 [View Source on GitHub](https://github.com/StormyOasis/linsta)

