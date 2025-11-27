Fix the following security vulnerabilities:



🔴 CRITICAL: Team Takeover Vulnerability
In your firestore.rules, the member creation rule has a major flaw:
firestore.rulesLines 29-37
        allow create: if isSignedIn() && request.auth.uid == memberId && (          // 1. Creating a new team (user adds themselves as owner)          request.resource.data.role == 'owner' ||                     // 2. Accepting an invite          (request.resource.data.role == 'member' &&           request.resource.data.invite_id != null &&           get(/databases/(default)/documents/teams/$(teamId)/invites/$(request.resource.data.invite_id)).data.email == request.auth.token.email)        );
The problem: Any authenticated user can add themselves as an owner to any team if they know (or guess) the team ID. The rule only checks:
User is signed in ✓
User is creating their own member doc ✓
Role is 'owner' ✓
It does NOT verify that the team was just created or that no other members exist. An attacker could take over any team.
🔴 CRITICAL: Privilege Escalation
firestore.rulesLine 40
        allow update, delete: if isTeamMember(teamId);
Any team member can:
Delete the owner from the team
Elevate their own role to owner
Remove all other members
Take complete control of the team
🟠 HIGH: Any Member Can Delete Critical Data
firestore.rulesLine 21
      allow update, delete: if isTeamMember(teamId);
firestore.rulesLine 62
      allow read, update, delete: if isTeamMember(resource.data.team_id);
Any member can delete the entire team and all collections—no role-based restrictions.
🟡 MEDIUM: Invite Manipulation
firestore.rulesLine 52
        allow update: if isTeamMember(teamId) || (isSignedIn() && resource.data.email == request.auth.token.email);
The invited user can update any field on their invite, not just the status. They could potentially change the email field or manipulate other data.
🟡 MEDIUM: Missing Collection Group Security for Documents
Your code uses collection group queries for documents:
collections.tsLines 219-225
export const getDocumentsByTeam = async (teamId: string) => {  return getCollectionGroup<Document>(    "documents",    where("team_id", "==", teamId),    orderBy("created_at", "desc")  );};
But there's no collection group rule for the documents subcollection in your security rules, meaning these queries may fail or bypass intended security.
🟡 MEDIUM: No Storage File Validation
Your storage rules don't restrict:
File types (could upload malicious executables)
File sizes (could exhaust your storage quota)
Recommended Fixes
Here's a hardened version of your Firestore rules:
rules_version = '2';service cloud.firestore {  match /databases/{database}/documents {        function isSignedIn() {      return request.auth != null;    }        function isTeamMember(teamId) {      return isSignedIn() && exists(/databases/(default)/documents/teams/$(teamId)/members/$(request.auth.uid));    }        function isTeamOwner(teamId) {      return isSignedIn() &&         get(/databases/(default)/documents/teams/$(teamId)/members/$(request.auth.uid)).data.role == 'owner';    }        function teamHasNoMembers(teamId) {      // Unfortunately, Firestore rules can't count documents      // So we check if the team document was JUST created (within 10 seconds)      return get(/databases/(default)/documents/teams/$(teamId)).data.created_at > request.time - duration.value(10, 's');    }    // Teams    match /teams/{teamId} {      allow read: if isTeamMember(teamId);      allow create: if isSignedIn();      allow update: if isTeamOwner(teamId);  // Only owners can update      allow delete: if isTeamOwner(teamId);  // Only owners can delete      // Members Subcollection      match /members/{memberId} {        allow read: if isTeamMember(teamId);                // Creating a member - FIXED        allow create: if isSignedIn() && request.auth.uid == memberId && (          // Owner adding themselves to a NEWLY CREATED team          (request.resource.data.role == 'owner' && teamHasNoMembers(teamId)) ||                    // Accepting an invite (must be 'member' role, not owner)          (request.resource.data.role == 'member' &&           request.resource.data.invite_id != null &&           get(/databases/(default)/documents/teams/$(teamId)/invites/$(request.resource.data.invite_id)).data.email == request.auth.token.email)        );                // Only owners can modify/remove members, and can't remove themselves if only owner        allow update: if isTeamOwner(teamId) && memberId != request.auth.uid;        allow delete: if isTeamOwner(teamId) && memberId != request.auth.uid;      }      // Invites Subcollection      match /invites/{inviteId} {        allow read: if isTeamMember(teamId) || (isSignedIn() && resource.data.email == request.auth.token.email);        allow create: if isTeamMember(teamId);                // Invited user can ONLY update status field        allow update: if isTeamMember(teamId) ||           (isSignedIn() &&            resource.data.email == request.auth.token.email &&           request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status']));                allow delete: if isTeamMember(teamId);      }    }    // Collections - add owner check for destructive operations    match /collections/{collectionId} {      allow read: if isTeamMember(resource.data.team_id);      allow create: if isTeamMember(request.resource.data.team_id);      allow update: if isTeamMember(resource.data.team_id);      allow delete: if isTeamOwner(resource.data.team_id);  // Only owners can delete            match /documents/{documentId} {        function getCollectionTeamId() {          return get(/databases/(default)/documents/collections/$(collectionId)).data.team_id;        }                allow read, write: if isTeamMember(getCollectionTeamId());      }    }        // Settings    match /settings/{userId} {      allow read, write: if isSignedIn() && request.auth.uid == userId;    }    // Collection Group Queries - ADD documents collection group    match /{path=**}/members/{memberId} {      allow read: if isSignedIn() && resource.data.user_id == request.auth.uid;    }        match /{path=**}/invites/{inviteId} {      allow read: if isSignedIn() && resource.data.email == request.auth.token.email;    }        // Allow documents collection group queries by team_id    match /{path=**}/documents/{documentId} {      allow read: if isSignedIn() && isTeamMember(resource.data.team_id);    }  }}
And for storage, add file type/size restrictions:
rules_version = '2';service firebase.storage {  match /b/{bucket}/o {        function isTeamMember(teamId) {      return request.auth != null && firestore.exists(/databases/(default)/documents/teams/$(teamId)/members/$(request.auth.uid));    }        function isValidImage() {      return request.resource.contentType.matches('image/.*') &&             request.resource.size < 10 * 1024 * 1024; // 10MB max    }    match /collections/{collectionId}/documents/{documentId}/{allPaths=**} {      allow read: if isTeamMember(        firestore.get(/databases/(default)/documents/collections/$(collectionId)).data.team_id      );      allow write: if isTeamMember(        firestore.get(/databases/(default)/documents/collections/$(collectionId)).data.team_id      ) && isValidImage();    }        match /{allPaths=**} {      allow read, write: if false;    }  }}
Would you like me to apply these fixes to your security rules?