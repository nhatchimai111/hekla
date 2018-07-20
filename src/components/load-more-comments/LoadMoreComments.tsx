import * as React from 'react';
import { View, Text, Image, TouchableHighlight } from 'react-native';
import { autobind } from 'core-decorators';
import Item from 'stores/models/Item';
import UI from 'stores/UI';
import { theme, getVar } from 'styles';
import { observer } from 'mobx-react';
const styles = theme(require('./LoadMoreComments.styl'));

type IItemType = typeof Item.Type;

interface Props {
  key?: string;
  item: IItemType;
  hidden: boolean;
  onPress?: (item: IItemType) => void;
  testID?: string;
}

@observer
export default class LoadMoreComments extends React.Component<Props> {

  @autobind
  onPress() {
    this.props.onPress(this.props);
  }

  render() {
    const { hidden, item } = this.props;
    const total = item.unfetched;

    if (hidden) {
      return null;
    }

    return (
      <View style={styles.host}>
        <TouchableHighlight
          onPress={this.onPress}
          activeOpacity={1}
          underlayColor={getVar('--content-bg-highlight')}
          style={styles.content}
        >
          <View style={[styles.container, styles[`level${item.level}`]]}>
            <Text style={[styles.text, UI.font(14)]}>{total} more {total === 1 ? 'reply' : 'replies'}</Text>
            <Image source={require('assets/icons/16/chevron-down.png')} style={styles.icon__more} />
          </View>
        </TouchableHighlight>
        <View style={styles[`divider${item.level}`]} />
        <View style={styles.border} />
      </View>
    );
  }
}
