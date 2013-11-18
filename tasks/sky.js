/*
 * grunt-sky
 * https://github.com/devinclark/sky
 *
 * Copyright (c) 2013 DevinClark
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
	'use strict';

	var _ = require('underscore');

	var regexes = {
		lineType: /\s?(\w{3,})\:\s/,
		lineTypeOnly: /\s?(\w{3,})\:\s(.+)/,
		jsDocStars: /^[\s|\t]{0,}\*\s{0,}/g,
		url: /(^|\s)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi,
		jsDocTag: /@(\w+)\s(.+)/gi,
		jsDocTitleTag: /@title\s(.+)/gi
	};

	function autolink(text) {
		return text.replace(regexes.url, "$1[$2]($2)");
	}

	function parseBlockComment(text) {
		text = text.replace('*\n * ', '');
		text = text.split('\n');
		for (var i = 0; i < text.length; i++) {
			text[i] = text[i].replace(regexes.jsDocStars, '');
			text[i] = text[i].trim();

			if (text[i].match(regexes.jsDocTitleTag)) {
				text.splice(i, 1);
			}
		}

		/*text = _.reject(text, function reject(item) {
			return item === "";
		});*/

		return text.join("\n");
	}

	function parseLineComment(text) {
		return text.replace(regexes.lineType, '');
	}

	function extractJSDocTag(text) {
		if (text.match(regexes.jsDocTag)) {
			var matches = regexes.jsDocTag.exec(text);
			if (matches !== null) {
				//grunt.log.writeln(matches);

				return {
					type: matches[1],
					description: matches[2]
				}
			}
		}
	}

	grunt.registerMultiTask('sky', 'A simple Markdown JavaScript documentation plugin.', function registerJSDocTask() {
		var esprima = require('esprima');
			// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options({
			header: "",
			// TODO: Add option for a header file path.
			lineComments: {
				exclude: [],
				include: []
			}
		});
		var commentsObj = [];
		var output = options.header || "";
		var lineComments = [];

		// Iterate over all specified file groups.
		this.files.forEach(function(f) {
			// Concat specified files.
			var fileGroup = grunt.file.expand({}, f.src);

			fileGroup.forEach(function(file) {
				var src = grunt.file.read(file);
				var comments = esprima.parse(src, {
					comment: true
				}).comments;

				commentsObj.push({file: file, comments: comments});
				//grunt.log.writeln(JSON.stringify(comments, null, 2));
			});

			commentsObj.forEach(function(obj) {
				// Loop through files
				var hasUserTitle;
				obj.comments.forEach(function(comment) {
					if (comment.type === "Block" && comment.value.match(/\*\n/)) {
						var match = extractJSDocTag(comment.value);
						if (match && match.type.toLowerCase() === "title") {
							hasUserTitle = match.description;
						}
					}
				});
				var shouldDisplayTitle = _.some(obj.comments, function(comment) {
					return comment.type === "Block" && comment.value.match(/\*\n/);
				});

				if (shouldDisplayTitle) {
					if (hasUserTitle) {
						output += "\n\n## " + hasUserTitle + "  \n";
						output += "_" + obj.file + "_\n\n";
					} else {
						output += "\n\n## " + obj.file + "\n\n";
					}
				}

				obj.comments.forEach(function(comment) {
					if (comment.type === "Line") {
						// Line comments
						if (comment.value.match(regexes.lineType)) {
							var type = comment.value.replace(regexes.lineTypeOnly, '$1');
							lineComments.push({
								type: type,
								text: parseLineComment(comment.value)
							})
						}
					} else if (comment.type === "Block" && comment.value.match(/\*\n/)) {
						output += parseBlockComment(comment.value);
					}
				});

			});

			output = output + "\n\n";

			// Group the lines by type.
			lineComments = _.groupBy(lineComments, 'type');

			if (options && options.lineComments && options.lineComments.exclude) {
				options.lineComments.exclude.forEach(function iteration(value) {
					if (lineComments[value]) {
						delete lineComments[value];
					}
				});
			}

			// Loop through and output each line comment type.
			_.forEach(lineComments, function iteration(value, key) {
				output += "\n## " + key + "\n\n";
				value.forEach(function iteration(value) {
					output += "* " + value.text + "\n";
				});
			});

			//grunt.log.writeln(JSON.stringify(lineComments, null, 2));

			output = autolink(output);
			grunt.file.write(f.dest, output);

			// Print a success message.
			grunt.log.writeln('File "' + f.dest + '" created.');
		});
	});

};
