import * as React from 'react';
import { View, FlatList, NativeModules, Dimensions, Platform } from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { autobind } from 'core-decorators';
import { observer } from 'mobx-react';
import { observable, autorun } from 'mobx';
import { Navigation } from 'react-native-navigation';
import storyTypeActionSheet from 'utils/actionsheets/storyType';
import StoryCard from 'components/story-card/StoryCard';
import Loading from 'components/loading/Loading';
import Toast from 'components/toast/Toast';
import Stories from 'stores/Stories';
import Item from 'stores/models/Item';
import UI from 'stores/UI';
import { theme, applyThemeOptions } from 'styles';
const styles = theme(require('./Stories.styl'));

interface Props {
  children: React.ReactNode;
  componentId?: string;
}

type IItemType = typeof Item.Type;

type Layout = {
  bottomTabsHeight: number;
  topBarHeight: number;
  statusBarHeight: number;
  width: number;
  height: number;
};

@observer
export default class StoriesScreen extends React.Component<Props> {

  private listRef = React.createRef() as any;
  private dispose;

  @observable
  isRefreshing = false;

  @observable
  offset = 0;

  @observable
  limit = 25;

  @observable
  layout = {
    bottomTabsHeight: -200,
  } as Layout;

  static get options() {
    return applyThemeOptions({
      topBar: {
        title: {
          text: String(Stories.prettyType),
        },
        hideOnScroll: UI.settings.general.hideBarsOnScroll,
        rightButtons: [{
          id: 'change',
          title: 'Change',
          icon: require('assets/icons/25/slider.png'),
        }],
      },
      bottomTab: {
        text: 'Stories',
        testID: 'STORIES_TAB',
        icon: require('assets/icons/25/stories.png'),
      },
    });
  }

  @autobind
  updateOptions() {
    Navigation.mergeOptions(this.props.componentId, StoriesScreen.options);
  }

  componentWillMount() {
    UI.addScreen(this);

    // Fetch data needed to display screen
    this.fetchData();

    // Update screen options on Stories.type change
    autorun(() => {
      if (Stories.type) {
        this.updateOptions();
      }
    });

    this.dispose = Navigation.events().registerNativeEventListener((name, params) => {
      if (name === 'bottomTabSelected') {
        const { selectedTabIndex, unselectedTabIndex } = params;
        if (selectedTabIndex === unselectedTabIndex && UI.componentId === this.props.componentId) {
          this.scrollToTop();
        }
      }
    });
  }

  componentWillUnmount() {
    Stories.dispose();
    this.dispose.remove();
    UI.removeScreen(this);
  }

  onNavigationButtonPressed(buttonId) {
    if (buttonId === 'change') {
      storyTypeActionSheet(this.onStoryTypeChange);
    }
  }

  @autobind
  async onRefresh() {
    ReactNativeHapticFeedback.trigger('impactLight', true);
    this.offset = 0;
    this.isRefreshing = true;
    await this.fetchData();
    this.isRefreshing = false;
  }

  @autobind
  onEndReached(e) {
    if (!Stories.isLoading) {
      this.offset += this.limit;
      this.fetchData();
    }
  }

  @autobind
  onStoryTypeChange({ id }) {
    if (Stories.setType(id)) {
      this.updateOptions();
      this.offset = 0;
      this.fetchData();
    }
  }

  @autobind
  async onLayout() {
    let bars = {
      bottomTabsHeight: 0,
      topBarHeight: 0,
      statusBarHeight: 0,
    };

    if (Platform.OS === 'ios') {
      bars = await Navigation.constants();
    }

    const { width, height } = Dimensions.get('window');

    this.layout = {
      ...bars,
      width,
      height,
    };
  }

  async fetchData() {
    if (this.offset === 0) {
      if (!this.isRefreshing) {
        // Scroll to top
        await this.scrollToTop();
      }

      // Clear stories
      Stories.clear();
    }

    // Fetch items needed to display this screen
    await Stories.fetchStories(this.offset, this.limit);
  }

  @autobind
  async scrollToTop() {
    const { topBarHeight, statusBarHeight } = this.layout;
    if (this.listRef.current) {
      this.listRef.current.scrollToOffset({ offset: -(topBarHeight + statusBarHeight) });
      await new Promise(r => setTimeout(r, 330));
    }
  }

  @autobind
  keyExtractor(item: IItemType, index: number) {
    if (!item) return `Story_${index}_Empty`;
    return `Story_${item.id}`;
  }

  @autobind
  renderStory({ item }: { item: IItemType }) {
    if (!item) return null;
    return (
      <StoryCard
        isMasterView={true}
        key={item.id}
        item={item}
      />
    );
  }

  render() {
    return (
      <View
        style={styles.host}
        testID="STORIES_SCREEN"
        onLayout={this.onLayout}
      >
        <FlatList
          ref={this.listRef}
          style={styles.list}
          data={Stories.stories}
          extraData={Stories.stories.length}
          ListFooterComponent={!this.isRefreshing && Stories.isLoading && <Loading end={true} />}
          keyExtractor={this.keyExtractor}
          renderItem={this.renderStory}
          refreshing={this.isRefreshing}
          onEndReachedThreshold={0.75}
          onRefresh={this.onRefresh}
          onEndReached={this.onEndReached}
          scrollEnabled={UI.scrollEnabled}
        />
        <Toast
          bottom={this.layout.bottomTabsHeight}
          visible={!UI.isConnected}
          message="You are offline"
          icon={require('assets/icons/16/offline.png')}
        />
      </View>
    );
  }
}
