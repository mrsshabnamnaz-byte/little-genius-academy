APNI AWAAZ MEIN KAHANIYAN (Recorded voice)
==========================================

Computer ki awaaz kabhi kabhi robot jaisi lagti hai. Sab se behtareen awaaz AAP KI APNI hoti hai!
Bachay ammi ki awaaz sab se zyada pasand karte hain.

Kaise karein (aasaan):
1. Phone ki Voice Recorder app se har page ko dheere dheere parh kar record karein.
2. Har recording ko .mp3 file banayein (phone ki app "Share/Save as MP3" deti hai, ya koi bhi online converter).
3. Is folder mein kahani ke naam ka folder banayein (chhote harf, '-' ke saath), aur har page ki file
   1.mp3, 2.mp3, 3.mp3 ... naam se rakhein.

   Misal:
   assets/audio/stories/sunny-the-little-duck/1.mp3
   assets/audio/stories/sunny-the-little-duck/2.mp3
   assets/audio/stories/twinkle-twinkle-little-star/1.mp3

   Folder ke naam:
     twinkle-twinkle-little-star   baa-baa-black-sheep   humpty-dumpty   little-raindrop
     sleepy-moon                   sunny-the-little-duck  the-red-balloon  the-kind-little-cat

4. manifest.json kholein aur likhein ke kis kahani ke kaun se page record hue hain. Misal:
   {
     "sunny-the-little-duck": [1, 2, 3, 4, 5],
     "twinkle-twinkle-little-star": [1, 2, 3]
   }
5. Website dobara upload (deploy) karein. Jin pages ki recording hogi unmein aap ki awaaz chalegi
   (lafz bhi saath saath highlight honge), baqi pages mein computer ki awaaz chalti rahegi.

Tips: shor se door, mobile ko munh se thori door rakh kar, dheere aur khushi se parhein. Har file chhoti rakhein (30 second tak).
