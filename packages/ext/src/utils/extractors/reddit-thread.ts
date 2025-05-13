import { Extractor, ExtractorResult } from '../../types/extractor';

interface RedditComment {
  kind: 't1';
  data: {
    body: string;
    author: string;
    score: number;
    created_utc: number;
    replies: RedditListing | '';
    depth: number;
  };
}

interface RedditPost {
  kind: 't3';
  data: {
    title: string;
    selftext: string;
    author: string;
    score: number;
    created_utc: number;
    num_comments: number;
    subreddit: string;
  };
}

interface RedditListing {
  kind: 'Listing';
  data: {
    children: (RedditPost | RedditComment)[];
  };
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function formatComment(comment: RedditComment, depth: number = 0): string {
  const indent = '  '.repeat(depth);
  const date = formatDate(comment.data.created_utc);
  const score = comment.data.score;
  const author = comment.data.author;
  const body = comment.data.body;

  let result = `${indent}[${date}] ${author} (score: ${score}):\n${indent}${body}\n`;

  if (comment.data.replies && typeof comment.data.replies !== 'string') {
    const replies = comment.data.replies.data.children
      .filter((child): child is RedditComment => child.kind === 't1')
      .map(reply => formatComment(reply, depth + 1))
      .join('\n');
    if (replies) {
      result += `\n${replies}`;
    }
  }

  return result;
}

export class RedditThreadExtractor implements Extractor {
  name = 'reddit-thread';
  description = 'Extract content from Reddit threads using the JSON API';

  extract(document: Document): ExtractorResult | null {
    const url = document.URL;
    const match = url.match(/reddit\.com\/r\/([^/]+)\/comments\/([^/]+)/);
    
    if (!match) {
      return null;
    }

    const [, subreddit, postId] = match;
    const jsonUrl = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json`;

    try {
      // 同步获取数据
      const xhr = new XMLHttpRequest();
      xhr.open('GET', jsonUrl, false);  // 同步请求
      xhr.send();
      
      if (xhr.status !== 200) {
        throw new Error(`Failed to fetch Reddit thread: ${xhr.statusText}`);
      }

      const data = JSON.parse(xhr.responseText) as [RedditListing, RedditListing];
      const post = data[0].data.children[0] as RedditPost;
      const comments = data[1].data.children.filter((child): child is RedditComment => child.kind === 't1');

      // Format post
      const postDate = formatDate(post.data.created_utc);
      const postScore = post.data.score;
      const postAuthor = post.data.author;
      const postTitle = post.data.title;
      const postText = post.data.selftext;
      const subredditName = post.data.subreddit;
      const commentCount = post.data.num_comments;

      let textContent = `[${postDate}] ${postAuthor} posted in r/${subredditName} (score: ${postScore}):\n`;
      textContent += `Title: ${postTitle}\n\n`;
      if (postText) {
        textContent += `${postText}\n\n`;
      }
      textContent += `--- ${commentCount} comments ---\n\n`;

      // Format comments
      const formattedComments = comments
        .map(comment => formatComment(comment))
        .join('\n');

      textContent += formattedComments;

      return {
        textContent,
        articleUrl: url
      };
    } catch (error) {
      console.error('[reddit-thread-extractor] Error:', error);
      return null;
    }
  }
} 