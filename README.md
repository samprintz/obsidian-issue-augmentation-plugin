# Obsidian GitHub Issue Augmentation Plugin

A plugin for [Obsidian.md](https://obsidian.md/) that augments GitHub issue IDs with their title.

For instance, the markdown text

```
- Finished #5432
- Working on #5434
- Next: #5435, backend#5433
```

renders to:

![20231014-190419-screenshot](https://github.com/samprintz/obsidian-issue-augmentation-plugin/assets/7581457/06bb2123-ef86-4175-834a-8fa29767f260)

Each issue title is a link to the GitHub repository.

## Configuration

There are two sources for augmenting issue IDs with descriptive issue texts

1. GitHub
2. a custom list of titles.

### GitHub Integration

For fetching information about issue IDs from GitHub,
specify the repository owner in the plugin settings.
Additionally, a GitHub personal access token (PAT) is required.
[Generate it](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and add it in the plugin settings.

It is possible to restrict the relevant repositories in the settings.
If not specified, all repositories of the owner are considered.

A default repository can be specified in the settings
to interpret issue IDs without repository name,
e.g. `#1234` instead of `myrepo#1234`.

### Custom Issue Title File

Alternatively or additionally, a CSV file can be specified in the settings
that provides a mapping issue ID to issue title.
It should look like this:

```
5432,My issue
backend#5433,Issue from another repository
5434,Some bug
5435,Cool feature
```

The CSV file path specified in the settings must be relative to the vault base directory.

### Using both

It's possible to use both, GitHub and a custom list of titles as source for the issue ID augmentation.
When for an issue ID there is a title from both sources, the custom list is preferred over the GitHub title.
