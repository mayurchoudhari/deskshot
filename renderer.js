// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {remote, desktopCapturer, screen, shell} = require('electron')
const fs = require('fs')
const os = require('os')
const path = require('path')
const FormData = require('form-data');
const request = require('request');

const Id = remote.getCurrentWindow().id;
const app = remote.app

let click = false;
let close = document.getElementById("close");
let shot = document.getElementById("shot").children[0];

close.addEventListener("click", function (event) {
    remote.BrowserWindow.getFocusedWindow().close();
})

shot.addEventListener("click", function (event) {
    remote.BrowserWindow.getFocusedWindow().minimize();
    click = true;
})

remote.BrowserWindow.getFocusedWindow().on("minimize", function (event) {
    setTimeout(function () {
        if (remote.BrowserWindow.fromId(Id).isMinimized() && click) {
            const thumbSize = determineScreenShotSize()
            let options = {types: ['screen'], thumbnailSize: thumbSize}
            desktopCapturer.getSources(options, function (error, sources) {
                if (error) return console.log(error)

                sources.forEach(function (source) {
                    if (source.name === 'Entire screen' || source.name === 'Screen 1') {
                        const screenshotPath = path.join(os.tmpdir(), 'screenshot.png')

                        fs.writeFile(screenshotPath, source.thumbnail.toPng(), function (error) {
                            if (error) return console.log(error)
                            let formData = {
                                file: fs.createReadStream(screenshotPath),
                            };
                            request.post({url:'https://file.io/?expires=1w', formData: formData}, function(err, httpResponse, body) {
                                if (err) {
                                    return app.console.log('upload failed:', err);
                                }
                                body = JSON.parse(body);
                                app.console.log(body);
                                if(body.success){
                                    remote.BrowserWindow.fromId(Id).setMaximumSize(800, 600);
                                    remote.BrowserWindow.fromId(Id).maximize();
                                    $("#shot").find("span").eq(0).html("File Uploaded, <a href='" + body.link + "'>download</a>");
                                    $("#shot").find("span").eq(1).html(body.link);
                                }
                            });
                            // shell.openExternal('file://' + screenshotPath)
                            // shell.showItemInFolder('file://' + screenshotPath)
                            shell.beep()
                            click = false
                        })
                    }
                })
            })
        }
    }, 1000)
})

function determineScreenShotSize() {
    const screenSize = screen.getPrimaryDisplay().workAreaSize
    const maxDimension = Math.max(screenSize.width, screenSize.height)
    return {
        width: maxDimension * window.devicePixelRatio,
        height: maxDimension * window.devicePixelRatio
    }
}