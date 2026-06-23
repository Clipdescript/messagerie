# Plan for Private Conversations Feature

## 1. Data Model
- Add a new Firestore collection `private_chats`.
- Document ID: `uid1_uid2` (sorted alphabetically to be unique).
- Fields:
  - `participants`: `[uid1, uid2]` (array for querying).
  - `updatedAt`: `serverTimestamp()`.
  - `lastMessage`: `string`.
  - `deletedBy`: `[uid]` (array of users who deleted the chat).

## 2. Opening a Private Conversation
- In `src/components/Chat.tsx`:
  - Make the `displayName` in messages clickable.
  - When clicked, check if it's not the current user. If so, call `onStartPrivateChat(otherUid, otherDisplayName)`.
- In `src/components/sidebar/SearchView.tsx`:
  - Add a "Message" button to each user.
  - When clicked, call `onStartPrivateChat(otherUid, otherDisplayName)`.
- In `src/components/HomeView.tsx`:
  - Pass `onStartPrivateChat` down to `Chat` and `SearchView`.
  - `onStartPrivateChat` will compute the `chatId` (`uid1_uid2`), then call `onSelectGroup(chatId, otherDisplayName)`.

## 3. Handling the Chat State and Props
- Modify `HomeView.tsx`'s `onSelectGroup` to accept a second parameter `groupName?: string`.
- Update `page.tsx` to handle `selectedChatName` state and pass it to `Chat.tsx`.
- In `Chat.tsx`, when sending a message:
  - Check if `groupId` starts with `private_`.
  - If so, extract the two UIDs.
  - Update/Create the `private_chats` document with `deletedBy: []`, `updatedAt`, `lastMessage`.
  - Send the message to the `messages` collection as usual.

## 4. Displaying Private Chats in Home Page
- In `HomeView.tsx`:
  - Add a listener to `private_chats` where `participants` contains `user.uid`.
  - Filter out chats where `deletedBy` includes `user.uid`.
  - Join with `allUsers` to get the other user's `displayName` and `photoURL`.
  - Pass `privateChats` to `DiscussionList.tsx`.
- In `DiscussionList.tsx`:
  - Map over `privateChats` and render them similarly to groups.
  - Add a "Trash" icon button to delete the chat.
  - When clicked, call `onDeletePrivateChat(chatId)`.

## 5. Deleting a Private Chat
- In `HomeView.tsx`, implement `onDeletePrivateChat(chatId)`:
  - Update `private_chats` document: `arrayUnion(user.uid)` to `deletedBy`.

## 6. Commands Compatibility
- `/myia` should work in private chats?
  - The requirement says: "La commande : /myia doit continuer à fonctionner dans les conversations privées exactement comme dans les groupes si elle est déjà supportée par le système."
  - Currently, `Chat.tsx` disables `/myia` for `ai-*` groups but enables it for others. We just need to make sure `private_` groups also support it if they do not start with `ai-`.
