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

	function parseBlockComment(text) {
		text = text.replace('*\n * ', '\n\n');
		text = text.split('\n');
		for (var i = 0; i < text.length; i++) {
			text[i] = text[i].replace(/^\s\*\s?/g, '');
			text[i] = text[i].replace(/\s+$/, '');
		}

		return text.join("\n");
	}

	function parseToDoComment(text) {
		return "* " + text.replace(' TODO: ', '') + "\n";
	}

	function parseFixMeComment(text) {
		return "* " + text.replace(' FIXME: ', '') + "\n";
	}

	grunt.registerMultiTask('sky', 'A simple Markdown JavaScript documentation plugin.', function registerJSDocTask() {
		var esprima = require('esprima');
			// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options({
			punctuation: '.',
			separator: ', '
		});
		var commentsObj = [];
		var output = "";
		var todos = "## TODO\n\n";
		var bugs = "## Bugs\n\n";

		// Iterate over all specified file groups.
		this.files.forEach(function(f) {
			// Concat specified files.
			grunt.log.writeln(f.src)
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
				if (commentsObj.length > 1) {
					// output headings for files.
					output += "## " + obj.file + "\n";
				}

				obj.comments.forEach(function(comment) {
					if (comment.type === "Line") {
						// Line comments
						if (comment.value.indexOf(' TODO: ') === 0) {
							todos += parseToDoComment(comment.value);
						}
						else if (comment.value.indexOf(' FIXME: ') === 0) {
							bugs += parseFixMeComment(comment.value);
						}
					} else if (comment.type === "Block" && comment.value.indexOf('*\n') == 0) {
						output += parseBlockComment(comment.value);
					}
				});

				grunt.log.writeln(JSON.stringify(obj, null, 2));
			});

			output = output + "\n\n" + todos + "\n\n" + bugs;
			grunt.file.write(f.dest, output);

			// Print a success message.
			grunt.log.writeln('File "' + f.dest + '" created.');
		});
	});

};
