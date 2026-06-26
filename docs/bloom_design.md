I want to build a tool called bloom which will be a web site (preferably still all entirely running in the client, static) that can be used as a front end for editing stories.
This tool should come with a suite of utilities to be able to launch locally, alternatively I want to host on my website. Ideally it should be able to generate a bloom story file, OR edit
an existing file that the user uploads. There is the trouble of some stories now being either story.yaml or story.yaml and chapters/chapterx.yaml. 

I have a couple ideas on how to handle that.

1. Maybe just read in one file each, so if a user has a 4 chapter story and wants to SEE all of the chapters, they can just file loader multiple files (is that possible? Could see why its not)
2. We just have them ALL in the same context space
3. We load one file only, and have support for both types of files since they are structured a little differently, or at least have different expectations.
4. We only offer single file generation/read for the web browser version but loading it in via your own PC and having the files on disk could be different.
5. maybe we say fuck it to the browser experience and make an actual UI application, but since it is a browser game then we'd need to implement a browser as a viewer and that SUCKS.

What do I want out of this?
* A passage editor that generates a passage. This is both a text editor, as well as a choice creator, etc.
* Be able to get context from a file, or maybe multiple files, or maybe just create a custom list of things like variables (name, etc) that can then be inserted into the editor, maybe like an ide like experience where it has a dropdown option to type
* Live preview of the passage being worked on.
* Map of passages visualized and clickable, that will be another view. You can see the big map and then click into them as needed. 
* Ideally I want to be able to visualize my entire story as a map and click into it as needed to edit. 
* the real premium experiecne will be that as I create a story, and, for example, create choices that lead to another passage, the tool will automatically create those passages for me, or at least represent htem in the map for me to click into and create.
* validator that will tell me if things are working, this maybe difficult if an incomplete state can be represented (i.e. only one chapter at a time limited due to web browser stuff)
* This UX should speed up the speed of editing these files, it should feel very natural and smooth, displaying nothing the author does not need until they decide they need it, for example, choices and gotos are shown, but conditionals and effects are not immediately appearing, an expansion reveals them. I want minimal visual clutter.
* Stretch is a theme editor, should be able to cook up a custom theme file that the author can save (or just copy from a text box), sliders, that sort of thing.


Things we may need to change about the engine
* Bloom should emit `conditions` for choice visibility. Choices NEED to be if/then, for example, IF you have 10 strength you can see the "pick up the tree" option. Whether this is greyed out or shown is an option for the author, but by default these should be hidden if the player does not match the conditional.
    * The engine supports the object form Bloom should generate:
        conditions:
          flags:
            intro_outlet_discord: true

* If the single story file is a huge pain, we could possibly keep the chapter paradigm but introduce a build utility to combine the chapters into a single story file. I don't love this option, it's not nice.
