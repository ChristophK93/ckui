---
'@ckui/core': patch
---

`ck-checkbox-group` is no longer marked touched when a mouse press moves focus from one of its checkboxes to another (a press on another checkbox's text), so its error no longer shows in the middle of picking options; it is touched once focus really leaves the group. A label id written by the server render is replaced on the client, so it can't collide with an id generated later.
