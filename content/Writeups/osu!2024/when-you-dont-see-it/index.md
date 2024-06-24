---
title: "when-you-dont-see-it"
date: 2024-03-09
draft: false
# description: ""
tags: ["web"]
---

**Challenge Description:** welcome to web! there's a flag somewhere on my osu! profile...

**Solving Process:** We're given this url to investigate https://osu.ppy.sh/users/11118671 . Nothing to see on the surface, what about when we look deeper, perhaps the source? What happens when we try a cheeky `ctrl + f` to find our flag?

![screenshot of 342 results for word flag](./Assets/osu_24_thats_a_lot_of_flags.png)

That's a **lot** of flags. Feels like our real flag is buried here somewhere. Since we're thinking buried, let's start from the last search result

![screenshot of last flag search result](./Assets/osu_24_final_flag.png)

**Flag:** `osu{ok_u_see_me}`