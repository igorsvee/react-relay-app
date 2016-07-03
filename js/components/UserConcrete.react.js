import React from "react";
import linkState from 'react-link-state';
import Relay from 'react-relay'
import UpdateUserMutation from '../mutations/UpdateUserMutation';

import autobind from 'autobind-decorator'
import {commitUpdate, toMongoId} from '../utils/RelayUtils'
import R from'ramda';
@autobind
class UserConcrete extends React.Component {

  static propTypes = {
    userId: React.PropTypes.string.isRequired,
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      editMode: false,
      username: '',
      address: '',
      updateFailed: false
    };

  }

  //todo not using constructor intentionally
  componentWillMount() {
    //  injected from react-router
    if (this.propsContainUser()) {
      this.updateUserStateFromProps(this.props)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.propsContainUser(nextProps)) {
      //  1st render with injected router props
      this.updateUserStateFromProps(nextProps)
      this.componentWillReceiveProps = function (nextProps) {
        if (this.props.store.userConnection != nextProps.store.userConnection) {
          console.log("user has changed ")
          this.updateUserStateFromProps(nextProps)
        }
      }

    }

  }

  userWasEdited() {
    const user = this.getUserFromProps();
    return this.state.username != user.username || this.state.address != user.address
  }



  propsContainUser(props = this.props) {
    return props.store.userConnection.edges.length != 0
  }

  getUserContent(user) {
    const idCell = (    <td>
      {toMongoId(user.id)}
    </td>);

    if (this.state.editMode) {
      return (<tr>
        {idCell}
        <td>
          <input valueLink={linkState(this, 'username')} ref="username" type="text"/>
        </td>
        <td>
          <input valueLink={linkState(this, 'address')} ref="address" type="text"/>
        </td>
      </tr>)
    } else {
      return (<tr>
        {idCell}
        <td>
          {user.username}
        </td>
        <td>
          {user.address}
        </td>
      </tr>)
    }


  }

  getUserControls() {
    const getButton = ({title, clickHandler}) => <button onClick={clickHandler}>{title}</button>;

    if (this.state.editMode) {
      return (
          <tr>
            <td>
              &nbsp;
            </td>
            <td>
              { getButton({
                title: 'Cancel Changes',
                clickHandler: this.updateUserStateFromProps.bind(this, this.props)
              })}

            </td>
            <td>
              { getButton({
                title: 'Update DB',
                clickHandler: this.handleSaveChanges
              })}

            </td>

          </tr>
      )
    } else {
      return (
          <tr>
            <td>
              { getButton({
                title: 'Edit',
                clickHandler: this.turnOnEditMode
              })}

            </td>
          </tr>
      )
    }


  }

  propertyChanged(propName) {
    return this.state[propName] !== this.getUserFromProps()[propName]
  }

  getUserFromProps(props = this.props) {
    return props.store.userConnection.edges[0].node;
  }

  handleSaveChanges() {
    const userStore = this.getUserFromProps();

    //  won't change, using it
    const id = userStore.id;

    const newUsername = this.propertyChanged('username') ? this.state.username : userStore.username;
    const newAddress = this.propertyChanged('address') ? this.state.address : userStore.address;

    console.log("Updated user %O...", {newUsername, newAddress, id});

    const updateMutation = new UpdateUserMutation(
        {
          username: newUsername,
          id,
          address: newAddress
          , storeId: this.props.store.id
        }
    );

    commitUpdate(Relay.Store, updateMutation)
        .then((resp)=>this.setState({updateFailed: false}))
        .catch(()=> this.setState({updateFailed: true}))
        .finally(this.turnOffEditMode)

    ;
  }

  turnOnEditMode = this._setStateAndCb.bind(this, undefined, {editMode: true});
  turnOffEditMode = this._setStateAndCb.bind(this, undefined, {editMode: false});

  _setStateAndCb(cb, state) {
    const thisFunc = this._setStateAndCb;
    if (arguments.length < this._setStateAndCb.length) {
      return thisFunc.bind(this, ...arguments)
    } else {
      this.setState({...state}, cb)
    }
  }

  setStateAndTurnOffEditMode = this._setStateAndCb(this.turnOffEditMode);

  updateUserStateFromProps = R.compose(this.setStateAndTurnOffEditMode, R.pick(['username', 'address']), this.getUserFromProps);

  render() {
    if (!this.propsContainUser()) {
      return <h3>No user with id #{this.props.userId} found</h3>
    }

    const {relay, store} = this.props;

    const user = this.getUserFromProps();

    return (
        <div>
          <h1>Concrete page for {user.username}:</h1>
          <table>
            <tr>
              <td>
                id
              </td>
              <td>
                username
              </td>
              <td>
                address
              </td>
            </tr>

            {this.getUserContent(user)}

            {this.getUserControls()}

          </table>

          {relay.hasOptimisticUpdate(store) && <h2>Updating...</h2>}
          {this.userWasEdited() && <h3>Has unsaved changes</h3>}
          {this.state.updateFailed && <strong>Update failed</strong>}
        </div>
    )
  }
}


UserConcrete = Relay.createContainer(UserConcrete, {
  initialVariables: {
    userId: null
  },

  fragments: {

// # This fragment only applies to objects of type 'Store'.
    store: (obj) => {
      console.log("obj %O", obj)

      return Relay.QL `
      fragment ff on Store {
             id,
           userConnection: userConnectionPaginated(id: $userId) {
               edges: edgesPaginated{
                  node {
    username,
    id,
    password,
    address,
    activated
                 
                  }
          }
       }
      }
      `

    }


  }
})

export default UserConcrete;
