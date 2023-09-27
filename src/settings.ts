import { App, PluginSettingTab, Setting } from 'obsidian';
import IssueAugmentationPlugin from 'main';
import { Subject } from 'rxjs';
import { debounceTime, tap } from "rxjs/operators";


export interface IssueAugmentationPluginSettings {
	issueFilePath: string,
	urlPrefix: string,
	repoOwner: string,
	repoName: string,
	githubToken: string, // TODO store encrypted
	titleColor: string,
}

export const DEFAULT_SETTINGS: IssueAugmentationPluginSettings = {
	issueFilePath: "",
	urlPrefix: "https://github.com/",
	repoOwner: "",
	repoName: "",
	githubToken: "",
	titleColor: "#888",
}


export class IssueAugmentationPluginSettingTab extends PluginSettingTab {
	plugin: IssueAugmentationPlugin;

	constructor(app: App, plugin: IssueAugmentationPlugin) {
		super(app, plugin);
		this.plugin = plugin;

		this.reloadIssueIdToTitleMapSubject = new Subject();
		this.reloadIssueIdToTitleMapSubject
			.pipe(
				debounceTime(2000),
				tap((v) => {
					this.plugin.reloadIssueIdToTitleMap();
				})
			)
			.subscribe();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Issue ID to title map')
			.setDesc('File path to a CSV file that provides a title for each issue')
			.addText(text => text
				.setValue(this.plugin.settings.issueFilePath)
				.onChange(async (value) => {
					this.plugin.settings.issueFilePath = value;
					await this.plugin.saveSettings();
					this.plugin.reloadEditorExtensions();
				})
			);

		new Setting(containerEl)
			.setName('URL prefix for issue IDs')
			.addText(text => text
				.setValue(this.plugin.settings.urlPrefix)
				.onChange(async (value) => {
					this.plugin.settings.urlPrefix = value;
					await this.plugin.saveSettings();
					this.reloadIssueIdToTitleMapSubject.next(value);
				})
			);

		new Setting(containerEl)
			.setName('GitHub repository owner')
			.addText(text => text
				.setValue(this.plugin.settings.repoOwner)
				.onChange(async (value) => {
					this.plugin.settings.repoOwner = value;
					await this.plugin.saveSettings();
					this.reloadIssueIdToTitleMapSubject.next(value);
				})
			);

		new Setting(containerEl)
			.setName('GitHub repositories (comma-separated; first is default)')
			.addText(text => text
				.setValue(this.plugin.settings.repoNames?.join(","))
				.onChange(async (value) => {
					const repoNames = []

					if (value?.length > 0) {
						const inputValues = value.split(",");
						const regex = /^[a-zA-Z0-9\\.\-_]+$/;

						for (const inputValue of inputValues) {
							regex.lastIndex = 0;
							const match = regex.exec(inputValue);
							if (match) {
								repoNames.push(inputValue);
							} else {
								console.warn(`Invalid repository name: ${inputValue}`);
							}
						}
					}

					this.plugin.settings.repoNames = repoNames;
					await this.plugin.saveSettings();
					this.reloadIssueIdToTitleMapSubject.next(value);
				})
			);

		new Setting(containerEl)
			.setName('GitHub token')
			.setDesc('GitHub token for retrieving issue titles')
			.addText(text => text
				.setValue(this.plugin.settings.githubToken)
				.onChange(async (value) => {
					this.plugin.settings.githubToken = value;
					await this.plugin.saveSettings();
					this.reloadIssueIdToTitleMapSubject.next(value);
				})
			);

		new Setting(containerEl)
			.setName("Title color")
			.setDesc('Color of issue title')
			.addColorPicker(component => component
				.setValue(this.plugin.settings.titleColor)
				.onChange(async (value) => {
					this.plugin.settings.titleColor = value;
					await this.plugin.saveSettings();
					this.plugin.reloadStyle();
				})
			);
	}
}