import DropdownTreeSelect from 'react-dropdown-tree-select';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import Styled from 'styled-components';
import { init } from 'contentful-ui-extensions-sdk';
import { createClient } from 'contentful';

import 'normalize.css';
import 'react-dropdown-tree-select/dist/styles.css';
import './index.css';

const Container = Styled.div`
    margin-top: 12px;    

    > button {
        margin-bottom: 12px;
    }
`;

const ImportButton = Styled.button`
    background: none;
    border: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0;
    margin: 0;
    color: #3c80cf;
    text-decoration: underline;

    &:hover,
    &:focus {
        color: #2a3039;
    }

    svg {
        margin-right: 4px;
        fill: #3c80cf;
    }

    &:hover svg {
        fill: #2a3039;
    }
`;

class CategoryTree extends React.Component {
    static propTypes = {
        sdk: PropTypes.object.isRequired
    };
    
    constructor(props) {
        super(props);

        this.state = {
            rootCategories: [],
            categoryTree: [],
            selectedIds: props.sdk.field.getValue() !== undefined ? props.sdk.field.getValue().map(reference => reference.sys.id) : [],
        };
    }

    createCategoryTree(entries) {
        return entries.map(category => {
            const node = {
                label: category.fields.name,
                value: category.sys.id,
                expanded: true,
                checked: this.state.selectedIds.includes(category.sys.id),
                disabled: !category.fields.isSelectable
            };

            if (category.fields.hasOwnProperty('subcategories')) {
                node.children = this.createCategoryTree(category.fields.subcategories);
            }

            return node;
        })
    }

    onImportClick = () => {
        const locale = this.props.sdk.field.locale;

        this.props.sdk.dialogs.selectSingleEntry({
            contentTypes: ['procedure'],
            locale: locale,
        })
            .then(selectedEntry => {
                if (selectedEntry.fields.hasOwnProperty('categories')) {
                    const selectedEntryCategoryIds = selectedEntry.fields.categories[locale].map(reference => reference.sys.id);
                    
                    this.setState({ selectedIds: selectedEntryCategoryIds }, () => { this.setState({ categoryTree: this.createCategoryTree(this.state.rootCategories) })});
                    this.props.sdk.field.setValue(selectedEntryCategoryIds.map(id => this.buildReference(id)));

                    // Throw a toast
                    this.props.sdk.notifier.success(`Imported ${selectedEntryCategoryIds.length} categories`);
                } else {
                    this.props.sdk.notifier.error(`Entry is not tagged with any categories!`);
                }
            });
    }

    onChange = (currentNode, selectedNodes) => {
        const selectedIds = selectedNodes.map(node => node.value);
        
        // this.setState({ selectedIds: selectedIds });
        this.props.sdk.field.setValue(selectedIds.map(id => this.buildReference(id)));
    }

    buildReference = (id) => {
        return {
            sys: {
                type: 'Link',
                linkType: 'Entry',
                id: id
            }
        };
    }

    componentDidMount() {
        this.props.sdk.window.startAutoResizer();

        const client = createClient({
            space: this.props.sdk.ids.space,
            environment: this.props.sdk.ids.environment,
            accessToken: process.env.REACT_APP_CONTENTFUL_ACCESS_TOKEN
        });

        // Fetch the root categories
        client.getEntries({
            content_type: 'category',
            'fields.isRootCategory': true,
            include: 3,
            order: 'fields.name',
        })
            .then(entries => this.setState({ rootCategories: entries.items, categoryTree: this.createCategoryTree(entries.items)}));
    }

    render() {
        return (
            <Container>
                <ImportButton onClick={this.onImportClick}>
                    <svg height="18" width="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                       <path d="M0 0h24v24H0z" fill="none"></path>
                       <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"></path>
                   </svg>

                   Import from another entry
                </ImportButton>

                <DropdownTreeSelect 
                    data={this.state.categoryTree} 
                    mode="hierarchical"
                    keepTreeOnSearch={true}
                    keepChildrenOnSearch={false}
                    onChange={this.onChange}
                />
            </Container>
        )
    }
}

console.clear();    // TODO: remove when done debugging

init(sdk => {
    ReactDOM.render(<CategoryTree sdk={sdk} />, document.getElementById('root'));
});

// TODO: detach change handler