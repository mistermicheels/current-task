This is a note I wrote to remind myself why I am not trying to keep up with new Electron releases for this app.

Following Electron releases is a lot of work and I don't see any real benefits from it, since old Electron is working and we're never processing some random potentially-malicious third-party content.

The biggest problem with Electron upgrades is that all of the tooling is so brittle. Additionally, there can be all kinds of regressions, especially given the fact that we're already using a lot of workarounds for the main app window behavior.

I also don't want to outsource any dependency changes to other developers, since there's a security risk involved and package-lock.json changes can be very hard to review.

## Upgrading to Electron 10

When upgrading to Electron 10, I had to update electron-forge.
This broke the start and desktop icon, sending me down a rabbit hole of broken dependencies, unofficial forks and incorrect documentation, finally arriving at this: https://github.com/mistermicheels/current-task/commit/11fc415e03f1c8764618955a7da8336ffb8bd844 (see also linked issues).
The 'About' window also started behaving differently for some reason, requiring this workaround: https://github.com/mistermicheels/current-task/commit/8fa8921cd770192db7228d082155f0fc47a00ff2.

## Trying to upgrade to Electron 16

When trying to upgrade to Electron 16, I had to update electron-forge again.
This broke everything until I figured out I needed Node 16 instead of 12.
Then, everything still broke because of some cryptic Webpack-related error messages.
Updating all related dependencies seemed to do something, but then I got stuck because of this: https://github.com/xz64/license-webpack-plugin/issues/111.
Downgrading that one doesn't work because older versions don't support the Webpack version that Forge uses.

I also tried upgrading to Electron 16 without updating electron-forge, but that's also a pain.
In order to have a chance of accomplishing this, I'd need to update node-abi at a deep level, and I didn't find a good way of doing so.
Tried with new package.json overrides functionality of npm 8.3+, npm ls looked very promising but the overrides didn't work (didn't update the dependency everywhere).
Tried with third-party npm-force-resolutions, that one did some weird stuff to package-lock.json and also didn't work in the end.

All in all, I lost 3+ hours of valuable weekend time on this and was still unable to get the app to start using Electron 16.
If the app would start, I would still have to check for (visual) regressions in the app and installers.
