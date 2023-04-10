import { Injectable } from '@angular/core';
import { collection, collectionData, doc, docData, Firestore, getDocs, query, where } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { updateDoc, getDoc } from "firebase/firestore";

import {
  ICreatePostRequest,
  ICreatePostResponse,
  IGetPostRequest,
  IGetPostResponse,
  IPost,
  IPosts,
  Hashtag,
  ICommentOnPostRequest,
  ICommentOnPostResponse,
  IBuyPostRequest,
  IBuyPostResponse,
  IComment

} from '@mp/api/postss/util';
import { PostTrendingGetQuery } from '@mp/api/postss/util';
import { update } from 'firebase/database';

// import {
//     Hashtag
//   } from './api/postss/util';


@Injectable()
export class PostApi {


  constructor(
    private readonly firestore: Firestore,
    private readonly functions: Functions
  ) { }

  post$(id: string) {
    const docRef = doc(
      this.firestore,
      `posts/${id}`
    ).withConverter<IPost>({
      fromFirestore: (snapshot) => {
        return snapshot.data() as IPost;
      },
      toFirestore: (it: IPost) => it,
    });
    return docData(docRef, { idField: 'postID' });
  }

  /* Query for posts by userId -> read only */
  /* returns an array of the fetched IPost objects */
  async getPostByUserId(userId: string): Promise<IPosts> {
    const postsQuery = query(
      collection(this.firestore, 'posts'),
      where('createdBy', '==', userId)
    ).withConverter<IPost>({
      fromFirestore: (snapshot) => {
        return {
          ...snapshot.data(),
          postID: snapshot.id,
        } as IPost;
      },
      toFirestore: (it: IPost) => it,
    });

    const posts = await collectionData<IPost>(postsQuery, { idField: 'postID' }).toPromise();
    return { posts: posts ?? [] };
  }


  /*
  Returns an array of IPost[] objects that are "trending"
  */
  async postTrendingGet(): Promise<IPost[]>{
     const callable = httpsCallable<undefined, IPost[]>(
      this.functions,
      "postTrendingGet"
     );

     const result = await callable(undefined);
     return result.data;
  }

  /* Query for posts by hashtag -> read only */
  /* returns an array of the fetched IPost objects filtered by hashtag */
  async getPostByHashtag(hashtag: Hashtag): Promise<IPosts> {
    const postsQuery = query(
      collection(this.firestore, 'posts'),
      where('hashtag', '==', hashtag)
    ).withConverter<IPost>({
      fromFirestore: (snapshot) => {
        return {
          ...snapshot.data(),
          postID: snapshot.id,
        } as IPost;
      },
      toFirestore: (it: IPost) => it,
    });

    const posts = await collectionData<IPost>(postsQuery, { idField: 'postID' }).toPromise();
    return { posts: posts ?? [] };
  }

  async createPost(request: ICreatePostRequest) {
    console.log('API createPost called with request:', request);
    return await httpsCallable<
      ICreatePostRequest,
      ICreatePostResponse
    >(
      this.functions,
      'createPost'
    )(request);
  }

  async likePost(postID: string): Promise<IPost> {
    //another of doing it is to import PostRepositoy and use the UpdateLikes function.
    const docRef = doc(
    this.firestore,
    `posts/${postID}`
    ).withConverter<IPost>({
    fromFirestore: (snapshot) => {
    return {
    ...snapshot.data(),
    postID: snapshot.id,
    } as IPost;
    },
    toFirestore: (it: IPost) => it,
    })

    const post = await docData(docRef).toPromise();
    if (!post) {
      throw new Error(`Post with ID ${postID} not found`);
    }
    const newLikeCount = post.likes + 1;

    await updateDoc(docRef, { likes: newLikeCount })

    return { ...post, likes: newLikeCount };
    }

    async commentOnPost(postID: string, comment: string): Promise<IPost> {
      const docRef = doc(
        this.firestore,
        `posts/${postID}`
      ).withConverter<IPost>({
        fromFirestore: (snapshot) => {
          return {
            ...snapshot.data(),
            postID: snapshot.id,
          } as IPost;
        },
        toFirestore: (it: IPost) => it,
      });

      const post = await docData(docRef).toPromise();
      if (!post) {
        throw new Error(`Post with ID ${postID} not found`);
      }

      const newComment: IComment = {
        creatorID : "1",
        comment: comment,
      }

      const newComments = [...post.comments ?? [], newComment];

      await updateDoc(docRef, { comments: newComments });

      return { ...post, comments: newComments };
    }

    /**
     *
     * @param postID
     * @param userID
     * @returns the updated post meta-data.
     */

    async buyPost(postID: string, userID: string): Promise<IPost> {
      const docRef = doc(
        this.firestore,
        `posts/${postID}`
      ).withConverter<IPost>({
        fromFirestore: (snapshot) => {
          return {
            ...snapshot.data(),
            postID: snapshot.id,
          } as IPost;
        },
        toFirestore: (it: IPost) => it,
      });

      const post = await docData(docRef).toPromise();
      if (!post) {
        throw new Error(`Post with ID ${postID} not found`);
      }

      if(!post.listing) {
        throw new Error(`Post with the ID ${postID} is not listed`)
      }

      const userRef = doc(this.firestore, 'users', userID);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        throw new Error(`User with ID ${userID} not found`);
      }

      const userData = docSnap.data();

      if (post.listing > userData['balance']) {
        throw new Error(`Insufficient balance to buy post with ID ${postID}`);
      }

      const newBalance = userData['balance'] - post.listing;

      await updateDoc(docRef, { sold: true });
      await updateDoc(userRef, { balance: newBalance });
      return { ...post, sold: true };
    }
  }


  /*
  Example for real-time read
  profile$(id: string) {
  async likePost(postID: string) {
    const docRef = doc(
      this.firestore,
      `posts/${postID}`
      ).withConverter<IPost>({
      fromFirestore: (snapshot) => {
      return {
      ...snapshot.data(),
      postID: snapshot.id,
      } as IPost;
      },
      toFirestore: (it: IPost) => it,
      })

      const post = await docData(docRef).toPromise();

      if (!post) {
    throw new Error(`Post with ID ${postID} not found`);
  }
      const newLikeCount = post.likes + 1;

      // await docRef.update();
      await updateDoc(docRef, { likes: newLikeCount })

      return { ...post, likes: newLikeCount };
  }

  async commentOnPost(postID: string, comment: any): Promise<IPost> { //will change the comment type later
    const postRef = doc(this.firestore, `posts/${postID}`);
    const postSnapshot = await getDoc(postRef);

    if(postSnapshot.exists()) {
      const post = postSnapshot.data() as IPost;
      const newCommentList = [...post.comments ?? [], comment];

      await updateDoc( postRef, { comments: newCommentList });

      return { ...post, comments: newCommentList };
    } else {
      throw new Error(`Post with ID ${postID} does not exist`);
    }
  }

  async buyPost(postID: string, buyerID: string): Promise<IPost> {
    const postRef = doc(this.firestore, `posts/${postID}`);
    const postSnapshot = await getDoc(postRef);

    if (postSnapshot.exists()) {
      const post = postSnapshot.data() as IPost;

      if (post.buyerID === null) {
        const updatedPost = {
          ...post,
          buyerID: buyerID,
          boughtAt: new Date(),
        };

        await updateDoc( postRef, updatedPost);
        return updatedPost;
      } else {
        throw new Error(`Post with ID ${postID} has already been bought`); // this will need further discussion
      }
    } else {
      throw new Error(`Post with ID ${postID} does not exist`);
    }
  }

}
*/
