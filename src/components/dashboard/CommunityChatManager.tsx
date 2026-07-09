'use client';
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Ensure this points to your client-side Firebase config

// Define the structure of your community chat document
interface ChatComment {
  text: string;
  userName: string;
}

interface ChatPost {
  id: string;
  authorId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  image?: string;
  likes: number;
  likedBy: string[];
  comments: ChatComment[];
  createdAt: any;
}

export default function CommunityChatManager() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [posts, setPosts] = useState<ChatPost[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Creating an Admin Post
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // States for Editing a Post
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostText, setEditPostText] = useState('');

  // ==========================================
  // 1. READ: Fetch all posts in real-time
  // ==========================================
  useEffect(() => {
    const q = query(collection(db, 'communitychat'), orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatPost[];
      
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching community chat:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // ==========================================
  // 2. CREATE: Admin Announcement Post
  // ==========================================
  const handleCreateAdminPost = async () => {
    if (!newPostText.trim()) return alert("Post text cannot be empty.");
    
    setIsPosting(true);
    try {
      await addDoc(collection(db, 'communitychat'), {
        authorId: 'admin_dashboard', // Identifying it as an admin action
        userName: 'UnsmokeLife Admin',
        userPhoto: '', // You can add a default admin logo URL here
        text: newPostText,
        image: '', 
        likes: 0,
        likedBy: [],
        comments: [],
        createdAt: serverTimestamp() // Uses Firebase server time
      });
      setNewPostText('');
      alert("Admin post published successfully.");
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Check console.");
    } finally {
      setIsPosting(false);
    }
  };

  // ==========================================
  // 3. UPDATE: Edit Post Content
  // ==========================================
  const startEditing = (post: ChatPost) => {
    setEditingPostId(post.id);
    setEditPostText(post.text);
  };

  const handleUpdatePost = async (postId: string) => {
    try {
      const postRef = doc(db, 'communitychat', postId);
      await updateDoc(postRef, {
        text: editPostText
      });
      setEditingPostId(null);
      setEditPostText('');
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Failed to update post.");
    }
  };

  // ==========================================
  // 4. DELETE: Remove Post Completely
  // ==========================================
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post completely? This action cannot be undone.")) return;
    
    try {
      await deleteDoc(doc(db, 'communitychat', postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post.");
    }
  };

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800">Community Moderation</h1>

      {/* CREATE POST BLOCK */}
      <div className="bg-white p-6 rounded shadow border space-y-4">
        <h2 className="font-semibold text-slate-700">Publish Admin Announcement</h2>
        <textarea 
          className="w-full border p-3 rounded h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" 
          placeholder="Write a message to the community..."
          value={newPostText}
          onChange={(e) => setNewPostText(e.target.value)}
        />
        <button 
          onClick={handleCreateAdminPost}
          disabled={isPosting || !newPostText.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPosting ? 'Publishing...' : 'Publish to Feed'}
        </button>
      </div>

      {/* READ / UPDATE / DELETE FEED */}
      <div className="space-y-6">
        <h2 className="font-semibold text-slate-700 text-lg border-b pb-2">Live Community Feed</h2>
        
        {loading ? (
          <p className="text-slate-500">Loading community posts...</p>
        ) : posts.length === 0 ? (
          <p className="text-slate-500">No posts found in the community.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white p-6 rounded shadow border flex flex-col gap-4">
              
              {/* Post Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {post.userPhoto ? (
                    <img src={post.userPhoto} alt={post.userName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
                      {post.userName?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-800">{post.userName}</p>
                    <p className="text-xs text-slate-500">
                      {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>
                
                {/* Moderation Controls (Delete) */}
                <button 
                  onClick={() => handleDeletePost(post.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
                >
                  Delete Post
                </button>
              </div>

              {/* Post Content (Edit Mode vs View Mode) */}
              {editingPostId === post.id ? (
                <div className="space-y-3">
                  <textarea 
                    className="w-full border p-3 rounded h-24 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={editPostText}
                    onChange={(e) => setEditPostText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdatePost(post.id)}
                      className="bg-emerald-600 text-white px-4 py-1.5 rounded text-sm hover:bg-emerald-700"
                    >
                      Save Changes
                    </button>
                    <button 
                      onClick={() => setEditingPostId(null)}
                      className="bg-slate-200 text-slate-700 px-4 py-1.5 rounded text-sm hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-slate-700 whitespace-pre-wrap">{post.text}</p>
                  
                  {/* Image Display */}
                  {post.image && (
                    <div className="border rounded overflow-hidden max-w-sm">
                      <img src={post.image} alt="Post attachment" className="w-full h-auto" />
                    </div>
                  )}
                  
                  <button 
                    onClick={() => startEditing(post)}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    Edit Text
                  </button>
                </div>
              )}

              {/* Engagement Stats & Comments */}
              <div className="bg-slate-50 p-4 rounded mt-2 border border-slate-100">
                <div className="flex gap-6 text-sm text-slate-600 mb-3 font-medium">
                  <span>❤️ {post.likes || 0} Likes</span>
                  <span>💬 {post.comments?.length || 0} Comments</span>
                </div>
                
                {post.comments && post.comments.length > 0 && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-slate-200">
                    {post.comments.map((comment, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-bold text-slate-700 mr-2">{comment.userName}:</span>
                        <span className="text-slate-600">{comment.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}