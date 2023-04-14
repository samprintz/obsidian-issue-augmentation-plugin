# Obsidian GitHub Issue Augmentation Plugin

A plugin for [Obsidian.md](https://obsidian.md/) that augments GitHub issue IDs with their title.

For instance, the markdown text

```
- Finished #5432
- Working on #5433
- Next: #5434, #5435
```

renders to:

![20230413-185428-screenshot](https://user-images.githubusercontent.com/7581457/231971667-c5ed7591-21a5-4f3f-9ae4-b90cbbb1ac08.png)

Each issue title is a link to the GitHub repository.

## Configuration

There are two sources for augmenting issue IDs with descriptive issue texts

1. GitHub
2. a custom list of titles.

### GitHub Integration

For fetching information about issue IDs from GitHub,
specify the repository owner and repository name in the plugin settings.
Moreover, a GitHub personal access token (PAT) is required.
[Generate it](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and add it in the plugin settings.

### Custom Issue Title File

Alternatively or additionally, a CSV file can be specified in the settings
that provides a mapping issue ID to issue title.
It should look like this:

```
5432,My issue
5433,Another issue
5434,Some bug
5435,Cool feature
```

The CSV file path specified in the settings must be relative to the vault base directory.

### Using both

It's possible to use both, GitHub and a custom list of titles as source for the issue ID augmentation.
When for an issue ID there is a title from both sources, the custom list is preferred over the GitHub title.
